from flask import jsonify,send_file
import os,datetime,io
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection_LLMCHATS = os.getenv("MONGO_COLLECTION_LLMCHATS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection_chatlogs = db[mongo_collection_LLMCHATS]

def saveLlmChatLogs(chatdata):
    try:
        data ={
            "uid":chatdata['uid'],
            "query":chatdata['query'],
            "llmGeneratedMessage":chatdata['generatedMessage'],
            "modelName":chatdata['modelName'],
            "created_at": datetime.datetime.now(),
            "startTime":chatdata['startTime'],
            "endTime":chatdata['endTime'],
            "comments":None,
            "userInput":None,
            "source":chatdata['source'],
        }
        
        result = collection_chatlogs.insert_one(data)
        return {'message': 'Chat log saved successfully', 'chatId': str(result.inserted_id)}, 200
    
    except Exception as e:
        print(f"Error during saving chat logs: {e}")
        return {'error': str(e)}, 500
    
def setChatcomments(chatId, comment,userInput=None):
    try:
        from bson import ObjectId
        chatId = ObjectId(chatId)

        if userInput is None:
            chatData = collection_chatlogs.update_one(
            {"_id": chatId},
            {"$set": {"comments": comment}}
        )
        else:
            chatData = collection_chatlogs.update_one(
            {"_id": chatId},
            {"$set": {"comments": comment,"userInput":userInput}}
        )
        

        return {'message': 'Comment updated successfully'} if chatData.modified_count > 0 else {'message': 'No document found with the given chatId'}
    
    except Exception as e:
        print(f"Error during setting chat comments: {e}")
        return {'error': str(e)}, 500


def downloadChatlogs(start_date_str,end_date_str):
    try:
        if not start_date_str or not end_date_str:
            return jsonify({'message': 'Start date and end date are required'}), 400

        # Convert the date strings into datetime objects
        start_date = datetime.datetime.fromisoformat(start_date_str)
        end_date = datetime.datetime.fromisoformat(end_date_str)

        # Connect to the MongoDB database and collection
        # Query the MongoDB collection to get chat logs within the date range
        chat_logs = list(collection_chatlogs.find({
            'created_at': {'$gte': start_date, '$lte': end_date}
        }))

        if len(chat_logs) == 0:
            return jsonify({'message': 'No chat logs found for the given date range'}), 404

        # Convert the MongoDB documents into a pandas DataFrame
        df = pd.DataFrame(chat_logs)

        # Drop the '_id' column if you don't want to include it in the Excel file
        df.drop(columns=['_id'], inplace=True)

        # Create an in-memory output file (BytesIO) to hold the Excel data
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='ChatLogs')

        output.seek(0)

        # Send the Excel file to the client
        return send_file(output,
                         as_attachment=True,
                         download_name=f"chat_logs_{start_date_str}_to_{end_date_str}.xlsx",
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    except Exception as e:
        print(f"Error during log download: {e}")
        return jsonify({'message': 'Error occurred while downloading logs', 'error': str(e)}), 500


def getChatHistory(uid):
    try:
        # Fetch chat logs with a limit of 5
        chat_logs = list(collection_chatlogs.find({
            'uid': uid},{"_id":0,"uid":0,"startTime":0,"endTime":0,"comments":0,"userInput":0}).limit(10))


        if len(chat_logs) == 0:
            return jsonify({'message': 'No chat logs found for the given user'}), 404

        return jsonify(chat_logs), 200
    
    except Exception as e:
        print(f"Error during fetching chat history: {e}")
        return jsonify({'message': 'Error occurred while fetching chat history', 'error': str(e)}), 500