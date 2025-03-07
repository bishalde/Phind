#!/bin/bash

# Define the paths to your Streamlit files and the ports you want to use
declare -A streamlit_files=(
  ["app_xlsx_csv.py"]=8501
  ["app_sql.py"]=8502
  ["app_docs.py"]=8503
  ["video_chat.py"]=8504
)

# Function to handle cleanup on script exit
cleanup() {
  echo "Stopping all Streamlit apps..."
  pkill -f "streamlit run"
  echo "All Streamlit apps stopped."
}

# Trap EXIT signal to run cleanup function
trap cleanup EXIT

# Start each Streamlit app on a different port
for file in "${!streamlit_files[@]}"; do
  port=${streamlit_files[$file]}
  streamlit run $file --server.port $port --server.maxUploadSize 1024 &
  echo "Started $file on port $port"
done

# Wait for all background processes to finish
wait
