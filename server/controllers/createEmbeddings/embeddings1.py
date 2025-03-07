import os,json,requests
import faiss
import numpy as np
import warnings
import logging
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_text_splitters import SentenceTransformersTokenTextSplitter
from langchain.storage import InMemoryStore
from langchain.schema.document import Document
from langchain.embeddings import OpenAIEmbeddings
from operator import itemgetter
import datetime,time
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION_FILES")
mongo_collection_EMBEDDINGS = os.getenv("MONGO_COLLECTION_EMBEDDINGS")
LLM_API_URL = os.getenv("LLM_API_URL")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection]
collection_embeddings = db[mongo_collection_EMBEDDINGS]

# Define paths
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
EMBEDDINGS_FOLDER = os.path.join(PROJECT_ROOT, 'embeddingsGenerated')

# Ensure EMBEDDINGS_FOLDER exists
if not os.path.exists(EMBEDDINGS_FOLDER):
    os.makedirs(EMBEDDINGS_FOLDER)

# all embedding models
EMBEDDING_MODELS = {'gte-small':{'source':'thenlper/gte-small',
                                 'embedding_dim':384,
                                 'max_input_tokens':512},
                    'gte-Qwen2-1.5B-instruct':{'source':'Alibaba-NLP/gte-Qwen2-1.5B-instruct',
                                 'embedding_dim':1536,
                                 'max_input_tokens':32000},
                    'bge-small-en-v1.5':{'source':'BAAI/bge-small-en-v1.5',
                                 'embedding_dim':384,
                                 'max_input_tokens':512},
                    'all-miniLM-L6-v2':{'source':'sentence-transformers/all-MiniLM-L6-v2',
                                 'embedding_dim':384,
                                 'max_input_tokens':256},
                    'stella_en_400M_v5':{'source':'dunzhang/stella_en_400M_v5',
                                 'embedding_dim':1024,
                                 'max_input_tokens':1024}
                    }

logging.basicConfig(
     filename="app.log",
     encoding="utf-8",
     filemode="a",
     format="{asctime} - {levelname} - {message}",
     style="{",
     datefmt="%Y-%m-%d %H:%M",
    level=logging.INFO,
)

# def docs_partition_by_unstructured(path, file_name):
#     '''
#     This function will read the pdfs using unstructured, which is a library that specializes in reading
#     unstructured data and can properly read text, tables and images.
#     args:
#         path: folder path where the file is located.
#         file_name

#     returns:
#         raw_pdf_elements which is basically a list of all document elements broken in chunks.
#     '''
#     raw_pdf_elements = partition_pdf(
#         filename=path+file_name,
#         extract_images_in_pdf=True,
#         infer_table_structure=True,
#         chunking_strategy="by_title",
#         max_characters=3000,
#         new_after_n_chars=2800,
#         combine_text_under_n_chars=1500,
#         image_output_dir_path=path
#     )
#     return raw_pdf_elements

def read_PDFs(read_option='PyMuPDF'):
    '''
    Will read PDFs using PyMuPDFLoader from the uploads location when called.
    '''
    try:


        logging.info("Reading PDFs started")
        
        
        # Fetching files from the collection
        files = collection.find({}, {"upload_path": -1, "_id": 0})
        allFiles = [i['upload_path'].split('/')[-1] for i in files]

        pdf_elements = []

        logging.info(f"Reading {len(allFiles)} files from the database.")

        for file_name in allFiles:
            file_path = os.path.join(UPLOAD_FOLDER, file_name)
            print(f"Processing file: {file_path}")

            if read_option == 'PyMuPDF':

                logging.info(f"Reading file {file_path} using PyMuPDFLoader.")

                loader = PyMuPDFLoader(file_path, extract_images=True)
                docs = loader.load()
                pdf_elements.extend(docs)

            # elif read_option == 'unstructured':
            #     one_file_elements = docs_partition_by_unstructured(UPLOAD_FOLDER, file_name)
            #     pdf_elements.extend(one_file_elements)

        logging.info(f"Read {len(pdf_elements)} documents from {len(allFiles)} files.")

        return pdf_elements, allFiles
        
    except Exception as e:
        print(f"Error during reading pdfs: {e}")
        return {'error': str(e)}, 500



def chunk_pdfs(pdf_elements, user_choice_embed_model:str, chunk_option='default', **kwargs):
    '''
    This function will get the documents and chunk it according to one of the options that 
    the user chooses
    The user has 3 options:
        1. Default chunking:
            chunk_size depends on the model chosen, by default we will try to take the 
            maximum tokens that can fit in the model
            chunk_overlap = 10 tokens

        2. Custom Chunking:
            user can input the chunk size and overlap but should be less than the 
            max_seq_length of the model chosen
        
        3. Semantic Chunking:
            Langchain has a semantic chunking function that chunks the data based on 3 criterias 
            i.e. BreakPointThresholdType:
            percentile
            standard deviation
            Interquartile

    returns:
    A list of embeddings (done according to the option chosen by the user) of all the docs 
    mentioned in the folder.
    '''

    try:
        logging.info("Chunking function called and started.....")

        # Extract any additional agruments if provided
        chunk_size = kwargs.get('chunk_size')
        chunk_overlap = kwargs.get('chunk_overlap')

        logging.info(f"Chunking PDFs with {chunk_option} option. {chunk_size} chunk size and {chunk_overlap} overlap.")

        if chunk_option=='default':
            logging.info("Default chunking selected.....")
            logging.info(user_choice_embed_model)
            chunk_size = EMBEDDING_MODELS[user_choice_embed_model]['max_input_tokens']
            logging.info(f"Chunk size: {chunk_size}")
            chunk_overlap = 20
            logging.info(f"Selected Default chunking with {chunk_size} chunk size and {chunk_overlap} overlap")

        elif chunk_option=='custom':
            try:
                if chunk_size == None or chunk_size > EMBEDDING_MODELS[user_choice_embed_model]['max_input_tokens']:
                    raise ValueError(f"""Need to mention a chunk size, smaller than 
                        {EMBEDDING_MODELS[user_choice_embed_model]['max_input_tokens']} Tokens.""")

                if chunk_overlap is None:
                    warnings.warn("It is preferred to have some overlap between chunks, but proceeding with no overlap.")

                logging.info("Custom chunking with size {chunk_size} and ")

            except ValueError as e:
                print(f"Invalid Input: {e}")
                return {'error': str(e)}, 400    
            
            except Exception as e:
                print(f"Error occured during custom chunking: {e}")
                return {'error':str(e)}, 500

        elif chunk_option=='semantic':
            print("Not ready yet, work under progress")

        # This text splitter uses sentence-transformer models, which by default splits 
        # the text into chunks that fits the token window of the sentence transformer model.
        token_text_splitter = SentenceTransformersTokenTextSplitter(
            chunk_overlap=chunk_overlap,
            model_name=EMBEDDING_MODELS[user_choice_embed_model]['source'],
            tokens_per_chunk=chunk_size,
            strip_whitespace=True
        )
        logging.info("Token text splitter initiated.....")

        splitted_pdf_elements= token_text_splitter.split_documents(pdf_elements)
        logging.info("pdf spiltted successfully.....")
        
        return splitted_pdf_elements

    except Exception as e:
        print(f"Error during chunking: {e}")
        return {'error': str(e)}, 500

def createEmbedding(embeddingData):
    # the embedding model should come from embeddingData but for now as we are testing doing it in another way. 
    # embeddingModel_name = embeddingData['embeddingModel']
    embeddingModel_name = EMBEDDING_MODELS[embeddingData["embeddingModel"]]['source']
    chunkSize = embeddingData['chunkSize']
    chunkOverlap = embeddingData['chunkOverlap']
    FAISS_FILE_NAME = f"faiss_index_{embeddingModel_name.replace('/', '_')}.bin"
    FAISS_INDEX_PATH = os.path.join(EMBEDDINGS_FOLDER,FAISS_FILE_NAME)
    METADATA_FILE_NAME = f"metadata_{embeddingModel_name.replace('/', '_')}.npy"
    METADATA_PATH = os.path.join(EMBEDDINGS_FOLDER,METADATA_FILE_NAME)
    
    try:
        logging.info("Embedding creation process started.....")

        # loading the pdfs from uploads and storing it in a list
        raw_pdf_elements, allFiles = read_PDFs(read_option='PyMuPDF')

        # Split the documents into chunks based on token count
        docs = chunk_pdfs(raw_pdf_elements,user_choice_embed_model=embeddingData['embeddingModel'], chunk_option='default', chunk_size=chunkSize,
                          chunk_overlap=chunkOverlap)
        
        logging.info(f"Chunked {len(docs)} documents.")
        
        # loading the embedding model
        embedding_model = HuggingFaceEmbeddings(
            model_name=embeddingModel_name,
            encode_kwargs={"normalize_embeddings": True},
            model_kwargs={"trust_remote_code": True} if "stella_en_400M_v5" in embeddingModel_name else {}
        )
        
        embedded_docs = embedding_model.embed_documents([doc.page_content for doc in docs])
        logging.info(f"Embedded {len(embedded_docs)} documents.")

        embedded_docs_array = np.array(embedded_docs).astype('float32')
        logging.info(f"Converted embeddings to array of shape {embedded_docs_array.shape}")

        metadata = [{'source': doc.metadata.get('source', 'file_path'), 'page': doc.metadata.get('page', 'unknown'), 'content': doc.page_content} for doc in docs]
        logging.info(f"Created metadata for {len(metadata)} documents.")

        index=None
        # Try loading existing FAISS index if it exists
        if os.path.exists(FAISS_INDEX_PATH):
            print("Existing FAISS index loaded.")
        else:
            print("No existing FAISS index found, creating a new one.")

        
        logging.info("Building FAISS index.....")

        # Build the FAISS index
        index = faiss.IndexFlatL2(embedded_docs_array.shape[1])  # L2 distance measure
        index.add(embedded_docs_array)  # Add embeddings to index
        
        logging.info("FAISS index built.")

        # Save the FAISS index and metadata
        faiss.write_index(index, FAISS_INDEX_PATH)
        np.save(METADATA_PATH, metadata)
        
        logging.info(f"FAISS index for {embeddingModel_name} saved to {FAISS_INDEX_PATH}")

        print(f"FAISS index for {embeddingModel_name} saved to {FAISS_INDEX_PATH}")
        print(f"Metadata saved to {METADATA_PATH}")

        embeddingModelData = {
            "embedding_model": embeddingModel_name,
            "faiss_index_path": FAISS_FILE_NAME,
            "metadata_path": METADATA_FILE_NAME,
            "created_at": datetime.datetime.fromtimestamp(time.time()).strftime('%Y-%m-%d %H:%M:%S')
        }

        collection_embeddings.insert_one(embeddingModelData)
        collection.update_many({}, {"$set": {"embedding_done": True}})

        logging.info(f"Embedding model data saved to MongoDB.")

        return {'files': allFiles, 'index_path': str(FAISS_INDEX_PATH).split("/")[-1], 'metadata_path': str(METADATA_PATH).split("/")[-1]}, 200

    except Exception as e:
        print(f"Error during embedding creation: {e}")
        return {'error': str(e)}, 500



def getEmbeddings():
    try:
        embeddings = collection_embeddings.find({}, {"_id": 0})
        allEmbeddings = [i for i in embeddings]
        return {'embeddings': allEmbeddings}, 200
    except Exception as e:
        return {'error': str(e)}, 500


def searchQuery(query_text, top_k=5):
    try:
        # Load the embeddings
        all_embeddings = collection_embeddings.find({}, {"_id": 0, "faiss_index_path": 1, "metadata_path": 1,"text_path":1})
        allEmbeddings = [i for i in all_embeddings]

        logging.info(f"all embeddings: {len(allEmbeddings)}")

        logging.info(f"Searching query: {query_text} with top_k={top_k}")

        # Query embedding model variable that will store the embedding model to encode the query
        query_embedding_model=None
                
        # Prepare a list to accumulate results
        all_results = []
        pages = []

        # Process each embedding
        for embedding in allEmbeddings:
            if "MiniLM" in embedding.get('faiss_index_path'):
                query_embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODELS['all-miniLM-L6-v2']['source'],
                                                              encode_kwargs={"normalize_embeddings": True})
            elif "bge" in embedding.get('faiss_index_path'):
                query_embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODELS['bge-small-en-v1.5']['source'],
                                                              encode_kwargs={'normalize_embeddings':True})

                
            logging.info(f"using ::: {query_embedding_model} :::: for query embedding")

            FAISS_INDEX_PATH = os.path.join(EMBEDDINGS_FOLDER, embedding['faiss_index_path'])
            METADATA_PATH = os.path.join(EMBEDDINGS_FOLDER, embedding['metadata_path'])
            
            # Load the FAISS index and metadata
            index = faiss.read_index(FAISS_INDEX_PATH)
            loaded_metadata = np.load(METADATA_PATH, allow_pickle=True).tolist()
            
            # Embed the query
            
            embedded_query = query_embedding_model.embed_query(query_text)
            query_vector = np.array(embedded_query).astype('float32').reshape(1, -1)

            logging.info(f"Query embedded and searching for nearest neighbors.")

            # Search the FAISS index for the nearest embeddings
            D, I = index.search(query_vector, top_k)
            
            # Fetch the matching metadata
            matched_metadata = [loaded_metadata[i] for i in I[0]]
            
            # Collect results for this embedding
            results_for_embedding = {
                'embedding': embedding,
                'results': []
            }

            for idx, metadata in enumerate(matched_metadata):
                results_for_embedding['results'].append({
                    'result_number': idx + 1,
                    'source': metadata['source'].split('/')[-1],
                    'page': int( metadata['page']),
                    'content': metadata['content']
                })
                pages.append(int(metadata['page']) -1)
                pages.append(int(metadata['page']))
                pages.append(int(metadata['page']) +1)

            all_results.append(results_for_embedding)

        logging.info(f"Search completed with {len(all_results)} results.")

        return {'results': all_results,"allPages":list(set(pages))}, 200
    
    except Exception as e:
        print(e)
        return {'error': str(e)}, 500
    






