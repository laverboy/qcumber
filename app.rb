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

#new project
post '/projects' do
    newProject = JSON.parse(request.body.read.to_s)
    Project.create(newProject)
end

#get tasks
get '/tasks' do
    content_type :json
    project = Project.get(params[:id])
    project.tasks.all.to_json
end

#new task
post '/tasks' do
    newTask = JSON.parse(request.body.read.to_s)
    project = Project.get(newTask['project_id'])
    project.tasks.create(newTask)
end

# get notes
get '/notes' do
    content_type :json
    task = Task.get(params[:id])
    task.notes.all.to_json
end

# update note change
put '/notes/:id' do 
    newNote = JSON.parse(request.body.read.to_s)
    note = Note.get(newNote['id'])
    note.update(newNote)
end

# new note
post '/notes' do
    newNote = JSON.parse(request.body.read.to_s)
    task = Task.get(newNote['task_id'])
    task.notes.create(newNote)
end

delete '/notes/:id' do
    note = Note.get(params[:id])
    note.destroy
end