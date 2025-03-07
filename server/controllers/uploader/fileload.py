from pymongo import MongoClient
from bson import ObjectId
import os
import datetime
from lxml import etree

from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
mongo_db = os.getenv("MONGO_DB")
mongo_collection = os.getenv("MONGO_COLLECTION_FILES")
mongo_collection_jira = os.getenv("MONGO_COLLECTION_JIRA_FILES")

client = MongoClient(mongo_uri)
db = client[mongo_db]
collection = db[mongo_collection]
jira_collection = db[mongo_collection_jira]


UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
JIRA_UPLOAD_FOLDER = 'jirauploads'
if not os.path.exists(JIRA_UPLOAD_FOLDER):
    os.makedirs(JIRA_UPLOAD_FOLDER)



def extract_data(file_path):
    # Parse the XML file with lxml
    parser = etree.XMLParser(recover=True)
    tree = etree.parse(file_path, parser)
    root = tree.getroot()

    # Initialize a dictionary to store extracted data
    jira_data = {
        'title': '',
        'link': '',
        'project': '',
        'description': '',
        'key': '',
        'summary': '',
        'type': '',
        'priority': '',
        'status': '',
        'assignee': '',
        'reporter': '',
        'created': '',
        'updated': '',
        'due': '',
        'comments': [],
        'attachments': [],
        'customfields': {}
    }

    # Extract main fields
    channel = root.find('channel')
    item = channel.find('item')
    
    jira_data['title'] = item.findtext('title')
    jira_data['link'] = item.findtext('link')
    jira_data['project'] = item.findtext('project')
    jira_data['description'] = item.findtext('description')
    jira_data['key'] = item.findtext('key')
    jira_data['summary'] = item.findtext('summary')
    jira_data['type'] = item.findtext('type')
    jira_data['priority'] = item.findtext('priority')
    jira_data['status'] = item.find('status').attrib.get('description', '')
    jira_data['assignee'] = item.findtext('assignee')
    jira_data['reporter'] = item.findtext('reporter')
    jira_data['created'] = item.findtext('created')
    jira_data['updated'] = item.findtext('updated')
    jira_data['due'] = item.findtext('due')

    # Extract comments
    for comment in item.findall(".//comment"):
        comment_data = {
            'author': comment.attrib.get('author', ''),
            'created': comment.attrib.get('created', ''),
            'text': comment.text.strip() if comment.text else ''
        }
        jira_data['comments'].append(comment_data)

    # Extract attachments
    for attachment in item.findall(".//attachment"):
        attachment_data = {
            'name': attachment.attrib.get('name', ''),
            'author': attachment.attrib.get('author', ''),
            'created': attachment.attrib.get('created', ''),
            'size': attachment.attrib.get('size', '')
        }
        jira_data['attachments'].append(attachment_data)

    # Extract custom fields
    for customfield in item.findall(".//customfield"):
        field_name = customfield.findtext('customfieldname')
        field_value = customfield.findtext('.//customfieldvalue')
        jira_data['customfields'][field_name] = field_value

    return jira_data

def format_jira_data_for_llm(jira_data):
    context = (
        f"The Following are the details of this Jira File  \n"
        f"- The Title of this Jira is : {jira_data['title']}\n"
        f"- The Link to the Jira is : {jira_data['link']}\n"
        f"- The Project Name of this Jira is: {jira_data['project']}\n"
        f"- The Description Of this Jira is : {jira_data['description']}\n"
        f"- The Key or the ID for the Jira is : {jira_data['key']}\n"
        f"- The Summary of this Jira is : {jira_data['summary']}\n"
        f"- The Type of this Jira is : {jira_data['type']}\n"
        f"- The Priority of this Jira is : {jira_data['priority']}\n"
        f"- The Status of this Jira is: {jira_data['status']}\n"
        f"- The Assignee of this Jira is: {jira_data['assignee']}\n"
        f"- The Reporter of this Jira is: {jira_data['reporter']}\n"
        f"- This Jira was Created on : {jira_data['created']}\n"
        f"- This Jira was Updated on : {jira_data['updated']}\n"
        f"- This Jira is Due till: {jira_data['due']}\n\n"
        
        f"The below all are the Comments made by different users for this jira \n"
    )

    for comment in jira_data['comments']:
        context += (
            f"  - **{comment['author']}** on {comment['created']}:\n"
            f"    {comment['text'] if comment['text'] else 'No content available'}\n"
        )

    context += "\nThe below all are the Attachments available for this Jira\n"
    count =0
    for attachment in jira_data['attachments']:
        context += (
            f"{count}  - {attachment['name']}  (by {attachment['author']}, "
            f"created on {attachment['created']}, size: {attachment['size']})\n"
        )
        count += 1

    # context += "\nThe below all are the Custom Fields for this jira\n"
    # for field_name, field_value in jira_data['customfields'].items():
    #     context += f"  - {field_name}: {field_value if field_value else 'No data available'}\n"

    return context.strip()







def upload_file(request):
    try:
        files = collection.count_documents({})
        if files >= 5:
            return {"error": "Maximum number of files reached"}, 400
        
        if 'file' not in request.files:
            return {"error": "No file part in the request"}, 400
        
        file = request.files['file']
        
 
        if file.filename == '':
            return {"error": "No file selected"}, 400
        
        filename = file.filename
        file_path = os.path.join(UPLOAD_FOLDER, filename)

     
        file.save(file_path)

        public_url = f"{request.host_url}files/{filename}"


        file_metadata = {
            "filename": filename,
            "upload_path": file_path,
            "upload_by": request.form.get('fullName'),
            "upload_date": datetime.datetime.now(),
            "size": os.path.getsize(file_path),
            "embeddings":False,
            "public_url": public_url,
        }

        print(public_url)
        # Insert file metadata into MongoDB
        collection.insert_one(file_metadata)

        return {"message": f"File '{filename}' uploaded and saved to database successfully", "url": public_url}, 200

    except Exception as e:
        return {"error": str(e)}, 500
    

def get_files(embeddingsChoice):
    try:
        if (embeddingsChoice=='False'):
            files = collection.find({"embeddings":False})
        else: 
            files = collection.find({})
        allFiles = {
            'files': [
                {
                    **file, 
                    '_id': str(file['_id'])  
                }
                for file in files
            ]
        }
        return allFiles, 200
    
    except Exception as e:
        return {"error": str(e)}, 500
    

def delete_file(file_id):
    try:
        # Find the file in the database by its ID
        file_to_delete = collection.find_one({"_id": ObjectId(file_id)})

        if not file_to_delete:
            return {"error": "File not found"}, 404
        
        # Get the file path from the database entry
        file_path = file_to_delete['upload_path']

        # Delete the file from the server storage
        if os.path.exists(file_path):
            os.remove(file_path)
        else:
            return {"error": "File not found on the server"}, 404

        # Remove the file metadata from the database
        collection.delete_one({"_id": ObjectId(file_id)})

        return {"message": f"File '{file_to_delete['filename']}' deleted successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 500


def upload_jira_file(request):
    try:
        if 'file' not in request.files:
            return {"error": "No file part in the request"}, 400
        
        file = request.files['file']
        
 
        if file.filename == '':
            return {"error": "No file selected"}, 400
        
        filename = "JIRA.xml"
        file_path = os.path.join(JIRA_UPLOAD_FOLDER, filename)
        saveFileName = "JIRA.txt"
        save_file_path = os.path.join(JIRA_UPLOAD_FOLDER, saveFileName)

        file.save(file_path)

        file_metadata = {
            "filename": filename,
            "upload_path": file_path,
            "upload_by": request.form.get('fullName'),
            "upload_date": datetime.datetime.now(),
            "size": os.path.getsize(file_path),
        }

        # Insert file metadata into MongoDB
        jira_collection.insert_one(file_metadata)

        jira_data = extract_data(file_path)
        formatted_context = format_jira_data_for_llm(jira_data)

        with open(save_file_path, 'w') as f:
            f.write(formatted_context)

        return {"message": f"File '{filename}' uploaded and saved to database successfully"}, 200

    except Exception as e:
        return {"error": str(e)}, 500