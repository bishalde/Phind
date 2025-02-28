import streamlit as st
import json
from langchain_groq import ChatGroq
from langchain.tools import tool
from langchain.agents import AgentType, initialize_agent, create_json_agent
from langchain.agents.agent_toolkits import JsonToolkit
from langchain.tools.json.tool import JsonSpec
from langchain.callbacks import StreamlitCallbackHandler
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain.schema import SystemMessage
import os

# Hardcoded Groq API key
os.environ["GROQ_API_KEY"] = "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"

# Initialize Groq LLM with specific parameters for JSON analysis
llm = ChatGroq(
    temperature=0.1,
    model_name="mixtral-8x7b-32768",
    max_tokens=4096,
    stop=None,
    streaming=True,
    request_timeout=60
)

# Initialize session state
if "messages" not in st.session_state:
    st.session_state.messages = []

def load_json_data(file):
    """Load data from JSON file"""
    try:
        content = file.read()
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON file: {str(e)}")

def create_json_agent(json_data):
    """Create a JSON agent with custom tools"""
    json_spec = JsonSpec(dict_=json_data, max_value_length=4000)
    json_toolkit = JsonToolkit(spec=json_spec)

    # Initialize agent with correct parameters
    return initialize_agent(
        tools=json_toolkit.get_tools(),
        llm=llm,
        agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=20,
        early_stopping_method="force"
    )

# App UI
st.title("💬 Chat with your JSON Data")
st.caption("Upload your JSON file and start asking questions!")

# File upload
uploaded_file = st.file_uploader(
    "Choose a JSON file",
    type=['json'],
    help="Upload the JSON file you want to analyze"
)

if uploaded_file:
    try:
        json_data = load_json_data(uploaded_file)
        
        with st.expander("Preview your JSON data"):
            st.json(json_data)
        
        with st.expander("JSON Structure Information"):
            st.write("Top-level keys:", list(json_data.keys()))
            st.write("Data type:", type(json_data).__name__)
            if isinstance(json_data, dict):
                st.write("Number of top-level items:", len(json_data))
            elif isinstance(json_data, list):
                st.write("Number of items in array:", len(json_data))
        
        agent_executor = create_json_agent(json_data)
        
        st.markdown("### Chat with your JSON data")
        
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
        
        if prompt := st.chat_input("Ask questions about your JSON data..."):
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)
            
            with st.chat_message("assistant"):
                try:
                    with st.spinner("Analyzing JSON data..."):
                        # Simplified prompt structure
                        response = agent_executor.invoke({
                            "input": f"Analyze this JSON data: {prompt}"
                        })
                        
                        if isinstance(response, dict) and "output" in response:
                            formatted_response = response["output"].strip()
                            st.markdown(formatted_response)
                            st.session_state.messages.append({
                                "role": "assistant",
                                "content": formatted_response
                            })
                        else:
                            st.error("Could not generate a response. Please try a different question.")
                            
                except Exception as e:
                    error_message = f"Error analyzing JSON: {str(e)}"
                    st.error(error_message)
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": f"⚠️ {error_message}"
                    })
    except Exception as e:
        st.error(f"Error loading JSON file: {str(e)}")
else:
    st.info("👆 Please upload a JSON file to begin the conversation!")
