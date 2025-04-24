from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from pydantic import BaseModel
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend

DATABASE_URL = "sqlite:///gradejournal.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Grade(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    score = Column(Integer)

    student = relationship("Student")
    subject = relationship("Subject")

Base.metadata.create_all(bind=engine)

class StudentCreate(BaseModel):
    name: str

class SubjectCreate(BaseModel):
    name: str

class GradeCreate(BaseModel):
    student_id: int
    subject_id: int
    score: int

@app.post("/students")
def create_student(student: StudentCreate):
    db = SessionLocal()
    db_student = Student(name=student.name)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    db.close()
    return db_student

@app.get("/students")
def get_students():
    db = SessionLocal()
    students = db.query(Student).all()
    db.close()
    return students

@app.delete("/students/{student_id}")
def delete_student(student_id: int):
    db = SessionLocal()
    student = db.query(Student).filter_by(id=student_id).first()
    if not student:
        db.close()
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    db.close()
    return {"status": "deleted"}

@app.post("/subjects")
def create_subject(subject: SubjectCreate):
    db = SessionLocal()
    db_subject = Subject(name=subject.name)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    db.close()
    return db_subject

@app.get("/subjects")
def get_subjects():
    db = SessionLocal()
    subjects = db.query(Subject).all()
    db.close()
    return subjects

@app.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int):
    db = SessionLocal()
    subject = db.query(Subject).filter_by(id=subject_id).first()
    if not subject:
        db.close()
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    db.close()
    return {"status": "deleted"}

@app.post("/grades")
def create_grade(grade: GradeCreate):
    db = SessionLocal()
    existing = db.query(Grade).filter_by(student_id=grade.student_id, subject_id=grade.subject_id).first()
    if existing:
        existing.score = grade.score
    else:
        new_grade = Grade(**grade.dict())
        db.add(new_grade)
    db.commit()
    db.close()
    return {"status": "ok"}

@app.get("/grades")
def get_grades():
    db = SessionLocal()
    grades = db.query(Grade).all()
    db.close()
    return grades

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username, password = form["username"], form["password"]
        if username == "admin" and password == "admin123":
            request.session.update({"token": "admin_token"})
            return True
        return False

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token")
        if token == "admin_token":
            return True
        return False

class StudentAdmin(ModelView, model=Student):
    column_list = [Student.id, Student.name]
    name = "Student"
    name_plural = "Students"
    icon = "fa fa-user"

class SubjectAdmin(ModelView, model=Subject):
    column_list = [Subject.id, Subject.name]
    name = "Subject"
    name_plural = "Subjects"
    icon = "fa fa-book"

class GradeAdmin(ModelView, model=Grade):
    column_list = [Grade.id, Grade.student, Grade.subject, Grade.score]
    name = "Grade"
    name_plural = "Grades"
    icon = "fa fa-star"

admin = Admin(app=app, engine=engine, authentication_backend=AdminAuth("Nurmuhammad"))
admin.add_view(StudentAdmin)
admin.add_view(SubjectAdmin)
admin.add_view(GradeAdmin)

@app.get("/", response_class=HTMLResponse)
async def serve_frontend(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})