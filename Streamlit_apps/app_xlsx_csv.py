import streamlit as st
import pandas as pd
import numpy as np
from groq import Groq

# Set page configuration
st.set_page_config(page_title="Data Q&A Assistant", layout="wide")

# Initialize Groq
GROQ_API_KEY = "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"
client = Groq(api_key=GROQ_API_KEY)

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
    Do not include backticks or markdown formatting.
    The code must be directly executable Python code that returns the result.
    Bad example: ```python\ndf['column'].mean()```
    Good example: df['column'].mean()
    """
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Generate code to answer: {question}"}
    ]
    
    response = client.chat.completions.create(
        messages=messages,
        model="mixtral-8x7b-32768",
        temperature=0.3,
        max_tokens=500
    )
    
    # Clean the response to ensure we only get the code
    code = response.choices[0].message.content.strip()
    # Remove any markdown code blocks if present
    code = code.replace('```python', '').replace('```', '').strip()
    # Remove any explanatory text before or after the code
    code = '\n'.join(line for line in code.split('\n') if not line.startswith('#') and line.strip())
    
    # Additional cleaning to remove unexpected characters
    code = code.replace('\\', '').strip()  # Remove any backslashes that might cause issues
    
    print(code)
    
    # Check if the code is valid Python syntax
    try:
        compile(code, '<string>', 'exec')
    except SyntaxError as e:
        st.error(f"Generated code has a syntax error: {str(e)}")
        return None
    
    return code

def execute_code_safely(code, df):
    """Execute the generated code in a controlled way"""
    if code is None:
        return "Invalid code generated."
    
    try:
        # Create a local namespace with only the dataframe
        local_ns = {'df': df, 'pd': pd, 'np': np}
        
        # Execute the code and capture the result
        exec(f"result = {code}", local_ns)
        
        return local_ns['result']
    except Exception as e:
        st.error(f"Error in code execution. Trying alternative approach...")
        try:
            # Try executing the code as a sequence of statements
            lines = code.strip().split('\n')
            for i in range(len(lines)-1):
                exec(lines[i], local_ns)
            # Execute the last line as the result
            exec(f"result = {lines[-1]}", local_ns)
            return local_ns['result']
        except Exception as e2:
            return f"Error executing code: {str(e2)}"

def format_result(result):
    """Format the result for better display"""
    if isinstance(result, pd.DataFrame):
        return result
    elif isinstance(result, pd.Series):
        return result.to_frame()
    elif isinstance(result, (list, tuple, np.ndarray)):
        if len(result) > 0:
            if isinstance(result[0], (str, int, float)):
                return pd.DataFrame({"Values": result})
            return pd.DataFrame(result)
    return str(result)

def main():
    st.title("📊 Smart Data Analysis Assistant")
    st.write("Upload your data file and ask questions about it!")

    # File upload
    uploaded_file = st.file_uploader("Upload CSV or Excel file", type=['csv', 'xlsx', 'xls'])

    if uploaded_file:
        # Load the data
        df = load_data(uploaded_file)
        
        if df is not None:
            # Show data preview
            st.subheader("Data Preview")
            st.dataframe(df.head())
            
            # Get dataframe info
            df_info = get_dataframe_info(df)
            
        
            # Question input
            question = st.text_area("Enter your question about the data:")
            
            if st.button("Get Answer"):
                if question:
                    try:
                        with st.spinner("Analyzing..."):
                            # Generate and execute code
                            code = generate_python_code(question, df_info)
                            
                            # For debugging - show generated code
                            with st.expander("View Generated Code"):
                                st.code(code, language='python')
                            
                            # Execute code and get result
                            result = execute_code_safely(code, df)
                            
                            # Display result
                            st.subheader("Answer:")
                            formatted_result = format_result(result)
                            st.write(formatted_result)
                            
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
                else:
                    st.warning("Please enter a question!")

if __name__ == "__main__":
    main()
