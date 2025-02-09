import os
import yt_dlp
import whisper
from sentence_transformers import SentenceTransformer
import faiss
import streamlit as st
import pickle
from langchain_core.runnables import RunnablePassthrough
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser

groq_api_key = "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"

# Step 1: Download audio from YouTube
def download_audio_from_youtube(video_url, output_path="Audio/"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    video_id = video_url.split("v=")[1] if "v=" in video_url else video_url.split("/")[-1]
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_path,video_id),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'keepvideo': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([video_url])

# Step 2: Transcribe audio using Whisper
def transcribe_audio(file_path, model_name="base"):
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"The audio file {file_path} does not exist.")

        with st.spinner("Loading Whisper model..."):
            model = whisper.load_model(model_name)

        with st.spinner("Generating transcript..."):
            result = model.transcribe(file_path)

            # Save transcript to a text file in Transcripts folder
            os.makedirs("Transcripts", exist_ok=True)
            transcript_path = os.path.join("Transcripts", "transcript.txt")
            with open(transcript_path, "w") as f:
                for segment in result['segments']:
                    f.write(f"{segment['start']}s to {segment['end']}s: {segment['text']}\n")

        return result['segments']

    except Exception as e:
        st.error(f"Error generating transcript: {e}")
        return None

# Step 3: Create embeddings for the transcript
def create_embeddings(transcript):
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L12-v2')
    texts = [seg['text'] for seg in transcript]
    metadata = [{'start': seg['start'], 'end': seg['end']} for seg in transcript]
    embeddings = model.encode(texts, convert_to_tensor=False)

    # Initialize FAISS index
    index = faiss.IndexFlatL2(embeddings[0].shape[0])
    index.add(embeddings)

    return index, texts, metadata

# Step 4: Save and load data
def save_data(video_id, index, texts, metadata):
    os.makedirs("Vector_Data", exist_ok=True)
    with open(f"Vector_Data/{video_id}_index.pkl", "wb") as f:
        pickle.dump(index, f)
    with open(f"Vector_Data/{video_id}_texts.pkl", "wb") as f:
        pickle.dump(texts, f)
    with open(f"Vector_Data/{video_id}_metadata.pkl", "wb") as f:
        pickle.dump(metadata, f)

def load_data(video_id):
    try:
        with open(f"Vector_Data/{video_id}_index.pkl", "rb") as f:
            index = pickle.load(f)
        with open(f"Vector_Data/{video_id}_texts.pkl", "rb") as f:
            texts = pickle.load(f)
        with open(f"Vector_Data/{video_id}_metadata.pkl", "rb") as f:
            metadata = pickle.load(f)
        return index, texts, metadata
    except FileNotFoundError:
        return None, None, None

# Step 5: Streamlit Q&A Interface
def qa_interface():
    st.title("Video Transcript Q&A")

    video_url = st.text_input("Enter YouTube video URL")

    if st.button("Process Video") and video_url:
        # Extract video ID from URL
        video_id = video_url.split("v=")[1] if "v=" in video_url else video_url.split("/")[-1]

        # Check if data exists
        index, texts, metadata = load_data(video_id)

        if index is None:
            with st.spinner("Downloading audio from video..."):
                download_audio_from_youtube(video_url)

            with st.spinner("Transcribing audio..."):
                transcript = transcribe_audio(f"Audio/{video_id}.mp3")

            if transcript:
                with st.spinner("Creating embeddings..."):
                    index, texts, metadata = create_embeddings(transcript)

                    # Save data for future use
                    save_data(video_id, index, texts, metadata)

                    st.session_state.vector_db = index
                    st.session_state.texts = texts
                    st.session_state.metadata = metadata
                    st.session_state.transcript_generated = True
                    st.success("Transcript and embeddings are ready!")
        else:
            st.session_state.vector_db = index
            st.session_state.texts = texts
            st.session_state.metadata = metadata
            st.session_state.transcript_generated = True
            st.success("Data loaded from storage!")

    if st.session_state.get("transcript_generated", False):
        st.header("Ask Questions")
        question = st.text_input("Enter your question about the video content")

        if st.button("Get Answer") and question:
            with st.spinner("Processing..."):
                # Setup LLM and retriever
                llm = ChatGroq(
                    temperature=0.1,
                    model_name="mixtral-8x7b-32768",
                    groq_api_key=groq_api_key
                )

                # Setup retriever
                retriever = st.session_state.vector_db
                query_vector = SentenceTransformer('sentence-transformers/all-MiniLM-L12-v2').encode([question])

                # Retrieve the nearest text
                distances, indices = retriever.search(query_vector, k=3)
                context = "\n".join([st.session_state.texts[i] for i in indices[0]])

                # Metadata for timestamps
                relevant_metadata = [st.session_state.metadata[i] for i in indices[0]]

                # RAG prompt
                template = """Answer the question based ONLY on the following context:
                {context}
                Question: {question}
                """

                prompt = ChatPromptTemplate.from_template(template)

                # Setup chain
                chain = (
                    RunnablePassthrough()
                    | (lambda x: {"context": context, "question": x})
                    | prompt
                    | llm
                    | StrOutputParser()
                )

                # Get response
                response = chain.invoke(question)

                # Display results
                st.write("Answer:", response)
                st.write("Relevant Timestamps:")
                for meta in relevant_metadata:
                    st.write(f"{meta['start']}s to {meta['end']}s")

if __name__ == "__main__":
    qa_interface()
