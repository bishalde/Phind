import streamlit as st
import pandas as pd
import numpy as np
import ollama

# Set page configuration
st.set_page_config(page_title="Data Q&A Assistant", layout="wide")

# Custom CSS for background gradient
st.markdown(
    """
    <style>
        body {
            background: linear-gradient(to bottom right, #001F3F, #000000);
            color: white;
        }
        .stApp {
            background: linear-gradient(to bottom right, #001F3F, #000000);
        }
    </style>
    """,
    unsafe_allow_html=True
)

# Model selection
model_options = ["qwen2.5:latest","llama3.2:1b", "llama3.2:3b","llama3.1:8b","deepseek-r1:1.5b"]
selected_model = st.selectbox("Choose an AI model:", model_options)

def load_data(file):
    try:
        if file.name.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.name.endswith('.xlsx'):
            df = pd.read_excel(file, engine='openpyxl')
        elif file.name.endswith('.xls'):
            df = pd.read_excel(file, engine='xlrd')
        return df
    except Exception as e:
        st.error(f"Error loading file: {str(e)}")
        return None

def get_dataframe_info(df):
    """Generate comprehensive information about the dataframe"""
    info = {
        'columns': list(df.columns),
        'dtypes': df.dtypes.astype(str).to_dict(),
        'sample_data': df.head(3).to_dict(),
        'numeric_columns': df.select_dtypes(include=[np.number]).columns.tolist(),
        'categorical_columns': df.select_dtypes(include=['object']).columns.tolist()
    }
    return info

def generate_python_code(question, df_info):
    system_prompt = f"""You are a data analysis assistant that generates Python code using pandas.
    The dataframe 'df' has the following structure:
    - Columns: {df_info['columns']}
    - Numeric columns: {df_info['numeric_columns']}
    - Categorical columns: {df_info['categorical_columns']}
    
    Important: Generate ONLY pure Python code using pandas to answer the question. 
    Do not include any explanations or comments.
    The code must be directly executable Python code that returns the result. dont give the print statement, just give the code
    """
    
    response = ollama.chat(
        model=selected_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Generate code to answer: {question}"}
        ]
    )
    
    code = response['message']['content'].strip()
    code = code.replace('```python', '').replace('```', '').strip()
    
    try:
        compile(code, '<string>', 'exec')
    except SyntaxError as e:
        st.error(f"Generated code has a syntax error: {str(e)}")
        return None
    
    return code

def execute_code_safely(code, df):
    if code is None:
        return "Invalid code generated."
    
    try:
        local_ns = {'df': df, 'pd': pd, 'np': np}
        exec(f"result = {code}", local_ns)
        return local_ns['result']
    except Exception as e:
        return f"Error executing code: {str(e)}"

def format_result(result):
    if isinstance(result, pd.DataFrame):
        return result
    elif isinstance(result, pd.Series):
        return result.to_frame()
    elif isinstance(result, (list, tuple, np.ndarray)):
        return pd.DataFrame({"Values": result}) if len(result) > 0 else "No data."
    return str(result)

def main():
    st.title("📊 Smart Data Analysis Assistant")
    st.write("Upload your data file and ask questions about it!")

    uploaded_file = st.file_uploader("Upload CSV or Excel file", type=['csv', 'xlsx', 'xls'])

    if uploaded_file:
        df = load_data(uploaded_file)
        
        if df is not None:
            st.subheader("Data Preview")
            st.dataframe(df.head())
            df_info = get_dataframe_info(df)
            
            question = st.text_area("Enter your question about the data:")
            
            if st.button("Get Answer"):
                if question:
                    with st.spinner("Analyzing..."):
                        code = generate_python_code(question, df_info)
                        with st.expander("View Generated Code"):
                            st.code(code, language='python')
                        result = execute_code_safely(code, df)
                        st.subheader("Answer:")
                        st.write(format_result(result))
                else:
                    st.warning("Please enter a question!")

if __name__ == "__main__":
    main()