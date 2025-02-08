from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import PyMuPDFLoader
import os,faiss,logging,fitz,requests,json
import numpy as np
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(
     filename="app.log",
     encoding="utf-8",
     filemode="a",
     format="{asctime} - {levelname} - {message}",
     style="{",
     datefmt="%Y-%m-%d %H:%M",
    level=logging.INFO,
)

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION_FILES")
mongo_collection_EMBEDDINGS = os.getenv("MONGO_COLLECTION_EMBEDDINGS")
LLM_API_URL = os.getenv("LLM_API_URL")


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


def fetch_pdf_content_by_pages(file_path, page_numbers):
    """
    Fetches the text content of the provided page numbers from the given PDF file.
    
    Args:
    - file_path (str): The path to the PDF file.
    - page_numbers (list): List of page numbers to extract (zero-based index).
    
    Returns:
    - dict: A dictionary where keys are page numbers and values are page text content.
    """
    try:
        logging.info(f"Fetching content from {page_numbers} pages in {file_path}.")
        
        # Open the PDF using PyMuPDF
        pdf_document = fitz.open(file_path)
        
        # Dictionary to store page number and content
        page_content_dict = {}
        
        for page_num in page_numbers:
            # Ensure the page number is valid
            if page_num < 0 or page_num >= pdf_document.page_count:
                logging.warning(f"Page number {page_num} is out of bounds for {file_path}. Skipping.")
                continue
            
            # Fetch the page
            page = pdf_document.load_page(page_num)
            page_text = page.get_text("text")
            page_content_dict[page_num] = page_text
        
        pdf_document.close()
        
        logging.info(f"Successfully fetched content from {len(page_content_dict)} pages.")
        return page_content_dict
    
    except Exception as e:
        logging.error(f"Error fetching content from PDF: {e}")
        return {'error': str(e)}, 500


def chatWithLLM(uid,query_text,modelName,top_k=5):
    try:
        all_embeddings = collection_embeddings.find({}, {"_id": 0, "faiss_index_path": 1, "metadata_path": 1})
        allEmbeddings = [i for i in all_embeddings]
        query_embedding_model = None

        # Store page and source information
        pages = []

        # Process each embedding
        for embedding in allEmbeddings:
            if "MiniLM" in embedding.get('faiss_index_path'):
                query_embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODELS['all-miniLM-L6-v2']['source'],
                                                              encode_kwargs={"normalize_embeddings": True})
            elif "bge" in embedding.get('faiss_index_path'):
                query_embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODELS['bge-small-en-v1.5']['source'],
                                                              encode_kwargs={'normalize_embeddings': True})
            elif "stella" in embedding.get('faiss_index_path'):
                query_embedding_model = HuggingFaceEmbeddings(model_name=EMBEDDING_MODELS['stella_en_400M_v5']['source'],
                                                              encode_kwargs={'normalize_embeddings': True})
                
            FAISS_INDEX_PATH = os.path.join(EMBEDDINGS_FOLDER, embedding['faiss_index_path'])
            METADATA_PATH = os.path.join(EMBEDDINGS_FOLDER, embedding['metadata_path'])
            
            # Load the FAISS index and metadata
            index = faiss.read_index(FAISS_INDEX_PATH)
            loaded_metadata = np.load(METADATA_PATH, allow_pickle=True).tolist()
            
            embedded_query = query_embedding_model.embed_query(query_text)
            query_vector = np.array(embedded_query).astype('float32').reshape(1, -1)

            # Search the FAISS index for the nearest embeddings
            D, I = index.search(query_vector, top_k)
            
            # Fetch the matching metadata
            matched_metadata = [loaded_metadata[i] for i in I[0]]
            
            # Collect results and relevant pages for fetching content
            for idx, metadata in enumerate(matched_metadata):
                page_num = int(metadata['page'])
                file_source = metadata['source'].split('/')[-1]

                # Add pages around the matched page (previous, current, next)
                pages.append({"page_number": page_num - 1, "source": file_source})
                pages.append({"page_number": page_num, "source": file_source})
                pages.append({"page_number": page_num + 1, "source": file_source})

        # Fetch the actual content from the PDF for the identified pages
        content_per_file = {}
        accumulated_context = ""
        
        for page_info in pages:
            file_path = os.path.join(UPLOAD_FOLDER, page_info['source'])
            page_number = page_info['page_number']
            
            # Ensure the file is not processed multiple times, accumulate data per file
            if file_path not in content_per_file:
                content_per_file[file_path] = {}
                
            # Fetch content from the specific page in the PDF
            page_content = fetch_pdf_content_by_pages(file_path, [page_number])
            
            # Merge content with previous entries for the same file
            content_per_file[file_path].update(page_content)
            
            # Accumulate the context from all the pages
            accumulated_context += f"\nPage {page_number + 1} from {file_path}:\n{page_content.get(page_number, '')}\n"
        
        # Send the accumulated context and query to the LLM API
        api_url = f"{LLM_API_URL}/chat"
        api_payload = {
            "uid": uid,
            "context": accumulated_context  + ". And answer based on the above context only.",
            "query": query_text,
            "modelName":modelName,
            "source":"llmchat"
        }
        headers = {'Content-Type': 'application/json'}
        
        response = requests.post(api_url, data=json.dumps(api_payload), headers=headers)
        
        if response.status_code == 200:
            llm_response = response.json().get('response', 'No response from LLM')
            generationTime = response.json().get('generationTime', '-- ms')
            chatId = response.json().get('chatId', None)
            
            # Return the LLM's response and the accumulated context
            return {
                "llm_response": llm_response,
                "chatId": chatId,
                "generationTime":str(generationTime)[:5]
            }, 200
        else:
            return {"error": "Failed to get response from LLM API"}, response.status_code

    except Exception as e:
        return {'error': str(e)}, 500