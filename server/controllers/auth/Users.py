from pymongo import MongoClient
from bson import ObjectId
import os

from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION_USERS")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection]

def add_user(user_data):
    if not user_data:
        return {"message": "No data provided"}, 400
    
    if "fullName" not in user_data or "userType" not in user_data or "email" not in user_data or "password" not in user_data or "verificationCode" not in user_data:
        return {"message": "Missing required data"}, 400
    
    if user_data['verificationCode'] != "BISDE":
        return {"message": "Invalid verification code"}, 400
    
    user_data.pop('verificationCode', None)
    
    alreadyExists = collection.find_one({'email': user_data['email']})
    
    if alreadyExists:
        return {"message": "User already exists"}, 400
    
    collection.insert_one(user_data)
    return {"message": "User added successfully"}, 201

def get_user(email,password):
    if email is None or password is None:
        return {"message": "Missing email or password"}, 400

    user = collection.find_one({'email': email})
    if not user:
        return {"message": "User not found"}, 404
    
    if user['password']!= password:
        return {"message": "Incorrect password"}, 401
    
    user_data = {
        "id": str(user['_id']), 
        "Message": "Successfully Login!",
        "userType": user['userType']
    }
    return user_data, 200

def verify_user(id):
    try:
        object_id = ObjectId(id)
    except:
        return {"message": "Invalid user ID format"}, 400
    
    user = collection.find_one({'_id': object_id})
    if not user:
        return {"message": "User not found"}, 404
    user_data ={
        "id": str(user['_id']),
        "Message": "User verified successfully",
        "verified": True,
        "userType": user['userType'],
        "fullName": user['fullName']
    }
    return user_data, 200