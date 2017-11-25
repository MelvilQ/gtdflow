from flask import Flask, jsonify, request, session
import MySQLdb as mysql
import MySQLdb.cursors
from flask.json import JSONEncoder
from datetime import date
from flask_sslify import SSLify

import config

app = Flask(__name__)
sslify = SSLify(app)    # always HTTPS

app.secret_key = config.SECRET_KEY   # for sessions
app.config['SESSION_COOKIE_HTTPONLY'] = False

con = mysql.connect(config.DB_SERVER, config.DB_USER, config.DB_PASS, config.DB_NAME, 
    cursorclass=MySQLdb.cursors.DictCursor)
con.autocommit(True)
con.ping(True)
db = con.cursor()

# format dates 
class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if isinstance(obj, date):
                return obj.isoformat()
            iterable = iter(obj)
        except TypeError:
            pass
        else:
            return list(iterable)
        return JSONEncoder.default(self, obj)
app.json_encoder = CustomJSONEncoder

@app.before_request
def checkAuthToken():
    if '/api/' in request.path and request.path != '/api/login':
        if 'username' not in session:
            return ('Not logged in...', 403)

@app.route('/')
@app.route('/index.html')
def sendIndexHtml():
    return app.send_static_file('index.html')

@app.route('/favicon.ico')
def sendFavicon():
    return app.send_static_file('favicon.ico')

@app.route('/sw.js')
def sendServiceWorker():
    return app.send_static_file('sw.js')

@app.route('/api/login', methods=['POST'])
def login():
    loginData = request.get_json(force=True)
    username = loginData["username"]
    password = loginData["password"]
    if(username == config.APP_USER and password == config.APP_PASS):
        session['username'] = username
        return jsonify(True)
    else:
        return ('', 403)

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('username')
    return jsonify(True)

@app.route('/api/activities', methods=['GET'])
def getActivities():
    db.execute("SELECT * FROM activities ORDER BY dateCreated")
    return jsonify(db.fetchall())

@app.route('/api/activity', methods=['POST'])
def addActivity():
    activity = request.get_json(force=True)
    values = (str(activity["text"]), int(activity["project"]), "ACTIVE", activity["dateCreated"])
    success = db.execute("INSERT INTO activities (text, project, status, dateCreated) VALUES (%s,%s,%s,%s)", values)
    if success == 1:
        return jsonify(db.lastrowid)
    else:
        return ('', 503)

@app.route('/api/activity/<int:id>', methods=['PUT'])
def modifyActivity(id):
    activity = request.get_json(force=True)
    for(key, value) in activity.items():
        if key == "text":
            db.execute("UPDATE activities SET text=%s WHERE id=%s", (value, id))
        elif key == "project":
            db.execute("UPDATE activities SET project=%s WHERE id=%s", (int(value), id))
        elif key == "status" and value in ["ACTIVE", "INACTIVE", "HOT", "DONE"]:
            db.execute("UPDATE activities SET status=%s WHERE id=%s", (value, id))
        elif key == "weblink":
            db.execute("UPDATE activities SET weblink=%s WHERE id=%s", (value, id))
        elif key == "dateDue":
            db.execute("UPDATE activities SET dateDue=%s WHERE id=%s", (value, id))
        elif key == "dateMarkedDone":
            db.execute("UPDATE activities SET dateMarkedDone=%s WHERE id=%s", (value, id))
    return ('', 204)

@app.route('/api/activity/<int:id>', methods=['DELETE'])
def deleteActivity(id):
    success = db.execute("DELETE FROM activities WHERE id = %s", (id,))
    if success == 1:
        return jsonify(id)
    else:
        return ('', 503)

@app.route('/api/projects', methods=['GET'])
def getProjects():
    db.execute("SELECT * FROM projects ORDER BY name")
    return jsonify(db.fetchall())

@app.route('/api/project', methods=['POST'])
def newProject():
    project = request.get_json(force=True)
    values = (str(project["name"]), int(project["hidden"]))
    success = db.execute('INSERT INTO projects (name, hidden) VALUES (%s,%s)', values)
    if success == 1:
        return jsonify(db.lastrowid)
    else:
        return ('', 503)

@app.route('/api/project/<int:id>', methods=['PUT'])
def modifyProject(id):
    project = request.get_json(force=True)
    for (key,value) in project.items():
        if key == 'name':
            db.execute('UPDATE projects SET name=%s WHERE id=%s', (value, id))
        if key == 'hidden':
            db.execute('UPDATE projects SET hidden=%s WHERE id=%s', (value, id))
    return ('', 204)

@app.route('/api/project/<int:id>', methods=['DELETE'])
def deleteProject(id):
    success = db.execute("DELETE FROM projects WHERE id = %s", (id,))
    if success == 1:
        db.execute("DELETE FROM activities WHERE project = %s", (id,))
        return jsonify(id)
    else:
        return ('', 503)


