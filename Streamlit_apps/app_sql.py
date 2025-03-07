from langchain_community.utilities.sql_database import SQLDatabase
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain, create_sql_query_chain
import os
import streamlit as st
import re


api_key = "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"
## To load the database
def load_db(db_name):
    db = SQLDatabase.from_uri(f"sqlite:///{db_name}")
    return db

# to create a sql query chain to execute queries
def chain_create(db):
    llm = ChatGroq(model="mixtral-8x7b-32768", api_key=api_key)
    chain = create_sql_query_chain(llm, db)
    return chain

# To create another chain to answer the queries based on the data retrieved by querying
def sql_infer(db, chain, user_question):
    # Get the SQL query from the chain
    sql_query = chain.invoke({"question": user_question})
    
    # Clean the SQL query by removing any prefixes like "SQLQuery:" or "SQL:"
    sql_query = re.sub(r'^(SQL\s*Query:|SQL:)\s*', '', sql_query.strip())
    
    # Execute the cleaned query
    result = db.run(sql_query)

    # Display the original query for reference
    st.code(sql_query)
    st.write(result)
    
    answer_prompt = PromptTemplate.from_template(
        """Given the following user question, corresponding SQL query, and SQL result, generate a proper reply to give to user

    Question: {question}
    SQL Query: {query}
    SQL Result: {result}
    Answer: """
    )

    llm_model = ChatGroq(model="mixtral-8x7b-32768", api_key=api_key)  # Use the api_key variable instead of env
    llm = LLMChain(llm=llm_model, prompt=answer_prompt)
    ans = llm(inputs={"question": user_question, "query": sql_query, "result": result})
    return ans["text"]

# Helper functions completed. Starting with the main function
def main():
    st.set_page_config(page_icon="📊", layout="wide", page_title="Database Administrator")
    st.title("Chat with your Database")

    col1, col2 = st.columns([2, 3])

    with col1:
        # Replace text input with file uploader
        uploaded_file = st.file_uploader("Choose a SQLite database file", type=['db', 'sqlite', 'sqlite3'])
        
        if uploaded_file is not None:
            # Save the uploaded file temporarily
            with open(uploaded_file.name, "wb") as f:
                f.write(uploaded_file.getbuffer())
            
            db = load_db(uploaded_file.name)

            st.subheader("Table Names")
            st.code(db.get_usable_table_names())

            st.subheader("Schemas")
            st.code(db.get_table_info())

    with col2:
        if uploaded_file is not None:  # Changed condition to check for uploaded file
            db = load_db(uploaded_file.name)
            chain = chain_create(db)
            question = st.text_input("Write a question about the data", key="question")

            if st.button("Get Answer"):
                if question:
                    attempt = 0
                    max_attempts = 5
                    while attempt < max_attempts:
                        try:
                            out = sql_infer(db, chain, question)
                            st.subheader("Answer")
                            st.write(out)
                            break

                        except Exception as e:
                            st.error(e)
                            attempt += 1
                            st.error(
                                f"Attempt {attempt}/{max_attempts} failed. Retrying..."
                            )
                            if attempt == max_attempts:
                                st.error(
                                    "Unable to get the correct query, refresh app or try again later."
                                )
                            continue

# Call the main function
if __name__ == "__main__":
    main()