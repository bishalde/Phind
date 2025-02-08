from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
import ollama # type: ignore
import datetime 


from controllers.chatlogs.chatlogs import saveLlmChatLogs,setChatcomments,downloadChatlogs,getChatHistory

app = Flask(__name__)
CORS(app)

@app.route('/',methods=['GET'])
def home():
    return "<H1>Model API - Homepage</H1>"

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        uid = data.get('uid')
        modelName = data.get('modelName')
        context = data.get('context', '').strip()  # Ensure context is clean
        query = data.get('query', '').strip()      # Ensure query is clean
        source = data.get('source', '').strip() # Ensure source is clean

        # Check if context and query are provided
        if not context or not query:
            return jsonify({'error': 'Context and query must be provided.'}), 400

        # System message to guide the LLM's behavior
        system_message = (
            """You are a highly specialized assistant. Your responses must strictly adhere to the context provided.
            Do not provide any information that is not directly related to the context, if any question is asked
            which is not in the document or irrelevant to the context of the documents you should then reply 'The question
            is irrelevant to the context'.
            Context: """ + context
        )

        # Constructing the message list with strict guidelines
        messages = [
            {
                'role': 'system',
                'content': system_message
            },
            {
                'role': 'user',
                'content': query
            }
        ]
        
        start_time = datetime.datetime.now()

        # Call the LLM model with context and query
        if modelName == 'llama3.2:latest':
            response = ollama.chat(model='llama3.2:latest', messages=messages)
        elif modelName == 'llama3.1:latest':
            response = ollama.chat(model='llama3.1:latest', messages=messages)
        elif modelName == 'mistral:latest':
            response = ollama.chat(model='mistral:latest', messages=messages)
        else :
            return jsonify({'error': f'Unsupported model: {modelName}'}), 400

        end_time = datetime.datetime.now()
        generation_time = (end_time - start_time).total_seconds()


        # Prepare chat log data
        chatLogData = {
            'uid': uid,
            'query': query,
            'generatedMessage': response['message']['content'],
            'modelName':modelName,
            'startTime': start_time,
            'endTime': end_time ,
            'source' : source
        }

        # Save the chat log
        savedChatData = saveLlmChatLogs(chatLogData)[0]

        return jsonify({'response': response['message']['content'], "chatId": savedChatData['chatId'],'generationTime': generation_time})

    except Exception as e:
        print(e)
        print(f"Error during LLM chat: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/chatcomments', methods=['GET'])
def ChatComments():
    try:
        chatId = request.args.get('chatId')
        comment = request.args.get("comment")
        userInput = request.args.get("userInput",None)
        if userInput:
            chatLogData = setChatcomments(chatId,comment,userInput)
        else:
            chatLogData = setChatcomments(chatId,comment)
        return jsonify(chatLogData)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/downloadlogs',methods=['POST'])
def download_logs():
    try:
        # Get the start and end date from the request body
        data = request.json
        start_date_str = data.get('startDate')
        end_date_str = data.get('endDate')

        # Call the helper function to generate the Excel file
        return downloadChatlogs(start_date_str, end_date_str)

    except Exception as e:
        print(f"Error At APP: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/chathistory', methods=['GET'])
def chatHistory():
    try:
        uid = request.args.get('uid')
        chatLogData = getChatHistory(uid)[0]
        return chatLogData

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True,port=5001,host='0.0.0.0')
