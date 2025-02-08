import os
from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain_community.llms import Ollama
import datetime 
from torch import cuda


mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection_LLMCHATS = os.getenv("MONGO_COLLECTION_LLMCHATS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection_chatlogs = db[mongo_collection_LLMCHATS]


LLM_API_URL = os.getenv("LLM_API_URL")

JIRA_UPLOAD_FOLDER = 'jirauploads'
if not os.path.exists(JIRA_UPLOAD_FOLDER):
    os.makedirs(JIRA_UPLOAD_FOLDER)
faiss_index_file = os.path.join(JIRA_UPLOAD_FOLDER, 'faiss_index')

device = f'cuda:{cuda.current_device()}' if cuda.is_available() else 'cpu'


def UploadJira(request):
    try:
        file = request.files['file']
        if file.filename == '':
            return {"error": "No file selected"}, 400
        
        filename = file.filename
        file_path = os.path.join(JIRA_UPLOAD_FOLDER, filename)

     
        file.save(file_path)
        
        loader = PyMuPDFLoader(file_path,extract_images=True)
        documents = loader.load()


        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=20)
        all_splits = text_splitter.split_documents(documents)

        model_name = "BAAI/bge-small-en-v1.5"
        

        if device !='cpu':
            model_kwargs = {"device": "cuda"}
        else:
            model_kwargs = {"device": "cpu"}

        embeddings = HuggingFaceEmbeddings(model_name=model_name, model_kwargs=model_kwargs)

        # storing embeddings in the vector store
        vectorstore = FAISS.from_documents(all_splits, embeddings)

        faiss_index_file = os.path.join(JIRA_UPLOAD_FOLDER, 'faiss_index')
        vectorstore.save_local(faiss_index_file)

        return {"message": "Vector store saved successfully!", "path": faiss_index_file}, 200

    except Exception as e:
        print("Error in UploadURL: ", e)
        return {"error": str(e)}, 500




def chatWithJira(uid,query,modelName):
    try:
        if device !='cpu':
            model_kwargs = {"device": "cuda"}
        else:
            model_kwargs = {"device": "cpu"}
        
        model_name = "BAAI/bge-small-en-v1.5"
        embeddings = HuggingFaceEmbeddings(model_name=model_name, model_kwargs=model_kwargs)
        vectorstore = FAISS.load_local(faiss_index_file, embeddings,allow_dangerous_deserialization=True)
        llm = Ollama(model=modelName)

        start_time = datetime.datetime.now()

        chain = ConversationalRetrievalChain.from_llm(llm, vectorstore.as_retriever(), return_source_documents=True)
        chat_history = []

        result = chain.invoke({"question": query, "chat_history": chat_history})

        end_time = datetime.datetime.now()
        generation_time = (end_time - start_time).total_seconds()

        data ={
            "uid":uid,
            "query":query,
            "llmGeneratedMessage":result['answer'],
            "modelName":modelName,
            "created_at": datetime.datetime.now(),
            "startTime":start_time,
            "endTime":end_time,
            "comments":None,
            "userInput":None,
            "source":"urlchat",
        }
        
        # Insert the data into the MongoDB collection
        insertion_result = collection_chatlogs.insert_one(data)

        # Retrieve the inserted ID
        chat_id = str(insertion_result.inserted_id)
        return {
                    "llm_response": result['answer'],
                    "chatId": chat_id,
                    "generationTime":generation_time
            }, 200

    except Exception as e:
        print("Error in chatWithURL: ", e)
        return {"error": str(e)}, 500
    