require 'sinatra'
require 'data_mapper'
require 'json'

DataMapper.setup(:default, "sqlite3://#{Dir.pwd}/project.db" )

class Project
  include DataMapper::Resource

  property :id,         Serial    # An auto-increment integer key
  property :name,       String    # A varchar type string, for short strings
  property :created_at, DateTime  # A DateTime, for any date you might like.
  
  has n, :tasks
end

class Task
  include DataMapper::Resource

  property :id,         Serial    # An auto-increment integer key
  property :name,       String    # A varchar type string, for short strings
  property :percent,    String    # A varchar type string, for short strings
  property :created_at, DateTime  # A DateTime, for any date you might like.
  property :updated_at , DateTime
  
  belongs_to :project
  has n, :notes
end

class Note
  include DataMapper::Resource

  property :id,         Serial    # An auto-increment integer key
  property :text,       String    # A varchar type string, for short strings
  property :created_at, DateTime  # A DateTime, for any date you might like.
  property :updated_at , DateTime
  
  belongs_to :task
end

DataMapper.auto_upgrade!

check = Project.all

if check.empty?

    project1 = {
        :name => "project 1"
    }
    task1 = {
        :name => "do something",
        :percent => "0"
    }
    note1 = {
        :text => "task 1 started"
    }
    
    p1 = Project.create(project1)
    
    t1 = p1.tasks.create(task1)
    
    n1 = t1.notes.create(note1)

end


get '/' do 
    @projects = Project.all.to_json
    erb :index
end

# ---------------
# Projects
# ---------------

# create
post '/projects' do
    newProject = JSON.parse(request.body.read.to_s)
    p = Project.create(newProject)
    p.to_json
end

# update
put '/projects/:id' do
    req = JSON.parse(request.body.read.to_s)
    project_to_update = Project.get(params[:id])
    a = project_to_update.update(req)
    a.to_json
end

# delete
delete '/projects/:id' do
    project_to_delete = Project.get(params[:id])
    project_to_delete.destroy
end

# ---------------
# Tasks
# ---------------

# create
post '/tasks' do
    newTask = JSON.parse(request.body.read.to_s)
    project = Project.get(newTask['project_id'])
    project.tasks.create(newTask)
end

# read
get '/tasks' do
    content_type :json
    project = Project.get(params[:id])
    project.tasks.all.to_json
end

# update
put '/tasks/:id' do
    req = JSON.parse(request.body.read.to_s)
    taskToUpdate = Task.get(req['id'])
    a = taskToUpdate.update(req)
    a.to_json
end

# delete
delete '/tasks/:id' do
    task_to_delete = Task.get(params[:id])
    task_to_delete.destroy
end

# ---------------
# Notes
# ---------------

# create
post '/notes' do
    newNote = JSON.parse(request.body.read.to_s)
    task = Task.get(newNote['task_id'])
    n = task.notes.create(newNote)
    n.to_json
end

# read
get '/notes' do
    content_type :json
    task = Task.get(params[:id])
    task.notes.all.to_json
end

# update
put '/notes/:id' do 
    newNote = JSON.parse(request.body.read.to_s)
    note = Note.get(newNote['id'])
    note.update(newNote)
end
 # delete
delete '/notes/:id' do
    note = Note.get(params[:id])
    note.destroy
end