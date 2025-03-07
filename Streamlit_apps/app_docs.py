import streamlit as st
import os
import fitz  # PyMuPDF
from PIL import Image
import io
import base64
from langchain_community.document_loaders import TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain_community.llms import Ollama
from langchain.docstore.document import Document

# Initialize embedding model
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Custom CSS for dark theme
def set_dark_theme():
    st.markdown(
        """
        <style>
        .stApp {
            background: linear-gradient(to bottom right, #001F3F, #000000);
            color: #ffffff;
        }
        .stTextInput>div>div>input {
            color: #ffffff;
            background-color: #2d2d2d;
        }
        .stButton>button {
            color: #ffffff;
            background-color: #4a4a4a;
            border-color: #4a4a4a;
        }
        .stButton>button:hover {
            background-color: #5a5a5a;
            border-color: #5a5a5a;
        }
        .stFileUploader>div>div>div>div>div {
            color: #ffffff;
            background-color: #2d2d2d;
        }
        .stMarkdown {
            color: #ffffff;
        }
        .stAlert {
            background-color: #2d2d2d;
            color: #ffffff;
        }
        .stSpinner>div>div {
            border-color: #ffffff transparent transparent transparent;
        }
        .stSelectbox>div>div>select {
            color: #ffffff;
            background-color: #2d2d2d;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

def extract_images_from_pdf(pdf_path, output_dir):
    """Extract images from PDF and save to output directory"""
    images = []
    pdf_document = fitz.open(pdf_path)
    
    for page_num in range(len(pdf_document)):
        page = pdf_document.load_page(page_num)
        image_list = page.get_images(full=True)
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = pdf_document.extract_image(xref)
            image_bytes = base_image["image"]
            
            # Save image
            image_filename = f"{os.path.splitext(os.path.basename(pdf_path))[0]}_p{page_num+1}_i{img_index+1}.{base_image['ext']}"
            image_path = os.path.join(output_dir, image_filename)
            
            with open(image_path, "wb") as img_file:
                img_file.write(image_bytes)
            
            images.append(image_path)
    
    pdf_document.close()
    return images

def process_pdf(file_path, temp_dir):
    """Process PDF file and extract text with image references"""
    images_dir = os.path.join(temp_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    
    # Extract images first
    images = extract_images_from_pdf(file_path, images_dir)
    
    # Extract text with image markers
    pdf_document = fitz.open(file_path)
    documents = []
    
    for page_num in range(len(pdf_document)):
        page = pdf_document.load_page(page_num)
        text = page.get_text()
        
        # Create document with image references
        doc = Document(
            page_content=text,
            metadata={
                "source": file_path,
                "page": page_num+1,
                "images": [img for img in images if f"_p{page_num+1}_" in img]
            }
        )
        documents.append(doc)
    
    pdf_document.close()
    return documents

def process_documents(uploaded_files):
    documents = []
    temp_dir = "temp"
    images_dir = os.path.join(temp_dir, "images")
    os.makedirs(images_dir, exist_ok=True)

    for file in uploaded_files:
        file_path = os.path.join(temp_dir, file.name)
        with open(file_path, "wb") as f:
            f.write(file.getbuffer())
        
        try:
            if file.name.endswith(".txt"):
                loader = TextLoader(file_path)
                docs = loader.load()
            elif file.name.endswith(".pdf"):
                docs = process_pdf(file_path, temp_dir)
            elif file.name.endswith(".docx"):
                loader = Docx2txtLoader(file_path)
                docs = loader.load()
            else:
                st.error(f"Unsupported file format: {file.name}")
                continue
            
            documents.extend(docs)
        except Exception as e:
            st.error(f"Error processing {file.name}: {str(e)}")
        finally:
            os.remove(file_path)
    
    # Split documents into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = text_splitter.split_documents(documents)
    return chunks

def main():
    # Set dark theme
    set_dark_theme()
    
    st.title("Docs Chat")

    # Model selection dropdown
    model_options = ["qwen2.5:latest", "llama3.2:1b", "llama3.2:3b", "llama3.1:8b", "deepseek-r1:1.5b"]
    selected_model = st.selectbox("Choose an AI model:", model_options)

    # Create temp directory if not exists
    if not os.path.exists("temp"):
        os.makedirs("temp")
    
    # File upload
    uploaded_files = st.file_uploader(
        "Upload documents",
        type=["txt", "pdf", "docx"],
        accept_multiple_files=True
    )
    
    if uploaded_files and st.button("Process Documents"):
        with st.spinner("Processing documents..."):
            # Process documents
            chunks = process_documents(uploaded_files)
            
            # Create vector store
            vector_store = FAISS.from_documents(chunks, embeddings)
            
            # Create QA chain with selected model
            llm = Ollama(model=selected_model, temperature=0)
            st.session_state.qa_chain = RetrievalQA.from_chain_type(
                llm,
                retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
                chain_type="stuff"
            )
            st.success("Documents processed successfully!")
    
    if "qa_chain" in st.session_state:
        question = st.text_input("Ask your question:")
        if question:
            with st.spinner("Generating answer..."):
                result = st.session_state.qa_chain.invoke({"query": question})
                st.subheader("Answer:")
                st.write(result["result"])

if __name__ == "__main__":
    main()