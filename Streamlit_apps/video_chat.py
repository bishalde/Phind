import os
import yt_dlp
import whisper
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import streamlit as st
import pickle
import ollama, torch

device = "cuda" if torch.cuda.is_available() else "cpu"
whisper_model = whisper.load_model("base").to(device)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Model selection
model_options = ["qwen2.5:latest", "llama3.2:1b", "llama3.2:3b", "llama3.1:8b", "deepseek-r1:1.5b"]
selected_model = st.selectbox("Choose an AI model:", model_options)

# Directories
DOWNLOAD_DIR = "./VideoQnA/downloads"
EMBEDDINGS_DIR = "./VideoQnA/embeddings"
TRANSCRIPTS_DIR = "./VideoQnA/transcripts"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
os.makedirs(EMBEDDINGS_DIR, exist_ok=True)
os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)

# Download YouTube audio
def download_audio(url):
    ydl_opts = {
        "format": "bestaudio/best",
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "mp3"}],
        "outtmpl": f"{DOWNLOAD_DIR}/%(id)s.%(ext)s",
        "extractor_args": {"youtube": {"player_client": ["web"]}},
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return info["id"], f"{DOWNLOAD_DIR}/{info['id']}.mp3", url

# Transcribe audio
def transcribe_audio(audio_path):
    result = whisper_model.transcribe(audio_path)
    transcript = [seg["text"] for seg in result["segments"]]
    segments = [{"start": seg["start"], "end": seg["end"], "text": seg["text"]} for seg in result["segments"]]
    return transcript, segments

# Generate embeddings
def generate_embeddings(transcript):
    return embedding_model.encode(transcript)

# Save transcript
def save_transcript(video_id, transcript):
    with open(f"{TRANSCRIPTS_DIR}/{video_id}.txt", "w") as f:
        f.write("\n".join(transcript))

# Load transcript
def load_transcript(video_id):
    transcript_path = f"{TRANSCRIPTS_DIR}/{video_id}.txt"
    if os.path.exists(transcript_path):
        with open(transcript_path, "r") as f:
            return [line.strip() for line in f.readlines()]
    return None

# Save embeddings
def save_data(video_id, embeddings, segments):
    with open(f"{EMBEDDINGS_DIR}/{video_id}.pkl", "wb") as f:
        pickle.dump({"embeddings": embeddings, "segments": segments}, f)

# Load embeddings
def load_data(video_id):
    try:
        with open(f"{EMBEDDINGS_DIR}/{video_id}.pkl", "rb") as f:
            data = pickle.load(f)
        return data["embeddings"], data["segments"]
    except FileNotFoundError:
        return None, None

# Query transcript
def query_transcript(embeddings, segments, query, k=3):
    query_embedding = embedding_model.encode([query])
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    distances, indices = index.search(query_embedding, k)
    return [{"start": segments[i]["start"], "text": segments[i]["text"]} for i in indices[0]]

# Get response from Ollama
def query_llm(context, query):
    messages = [
        {"role": "system", "content": "You are an AI assistant helping with video transcript queries."},
        {"role": "user", "content": f"Context: {context}\n\nQuery: {query}"}
    ]
    
    response = ollama.chat(selected_model, messages=messages) 
    return response['message']["content"] 

# Streamlit app
def main():
    st.title("Video Query App with LLM")
    
    video_source = st.radio("Choose video source:", ["Local Upload", "YouTube URL"])
    
    if video_source == "Local Upload":
        video_file = st.file_uploader("Upload your video", type=["mp4", "mov", "avi"])
        if video_file:
            video_id = video_file.name.split('.')[0]
            video_file_path = f"{DOWNLOAD_DIR}/{video_file.name}"
            with open(video_file_path, "wb") as f:
                f.write(video_file.getbuffer())
            st.session_state.video_id = video_id
            st.session_state.video_path = video_file_path
            st.video(video_file_path)
    
    elif video_source == "YouTube URL":
        youtube_url = st.text_input("Enter YouTube Video URL")
        if youtube_url and 'video_id' not in st.session_state:
            with st.spinner("Downloading audio..."):
                video_id, audio_path, _ = download_audio(youtube_url)
                st.session_state.video_id = video_id
                st.session_state.video_path = audio_path
                st.success("Audio downloaded successfully!")

    if 'video_id' in st.session_state:
        video_id = st.session_state.video_id
        embeddings, segments = load_data(video_id)
        transcript = load_transcript(video_id)
        
        if embeddings is None or transcript is None:
            with st.spinner("Processing audio..."):
                transcript, segments = transcribe_audio(st.session_state.video_path)
                save_transcript(video_id, transcript)
                embeddings = generate_embeddings([seg["text"] for seg in segments])
                save_data(video_id, embeddings, segments)
                st.success("Processing complete!")
        
        query = st.text_input("Enter your query")
        if query:
            with st.spinner("Searching..."):
                results = query_transcript(embeddings, segments, query)
                context = " ".join([res["text"] for res in results])
                llm_response = query_llm(context, query)
                
                st.write("### Query Results:")
                for res in results:
                    timestamp = res["start"]
                    minutes = int(timestamp // 60)
                    seconds = int(timestamp % 60)
                    
                    st.write(f"*Match at {minutes}:{seconds}* - {res['text']}")
                    if video_source == "YouTube URL":
                        youtube_url_with_time = f"{youtube_url}&t={int(timestamp)}s"
                        st.markdown(f"[Watch at {minutes}:{seconds}]( {youtube_url_with_time} )")
                    else:
                        if st.button(f"Play at {minutes}:{seconds}"):
                            st.video(st.session_state.video_path, start_time=int(timestamp))
                
                st.write("### LLM Answer:")
                st.write(llm_response)

if __name__ == "__main__":
    main()
