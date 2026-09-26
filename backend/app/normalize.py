"""Skill normalization layer: raw student input -> canonical skill names.

Curated, offline, deterministic. Makes the matching engine credible
without AI: "react.js" and "React Development" become "Web Development".
"""

ALIASES = {
    # web
    "web development": "Web Development",
    "web dev": "Web Development",
    "web": "Web Development",
    "frontend": "Web Development",
    "front end": "Web Development",
    "html css": "Web Development",
    "react": "Web Development",
    "reactjs": "Web Development",
    "react.js": "Web Development",
    "react development": "Web Development",
    "javascript": "Web Development",
    "js": "Web Development",
    # programming
    "python": "Python",
    "python programming": "Python",
    "coding": "Python",
    "java": "Java",
    "c++": "C++",
    "cpp": "C++",
    "c plus plus": "C++",
    # data
    "data science": "Data Science",
    "data analysis": "Data Science",
    "analytics": "Data Science",
    "sql": "SQL",
    "mysql": "SQL",
    "postgres": "SQL",
    "database": "SQL",
    # app
    "mobile app development": "Mobile App Development",
    "mobile development": "Mobile App Development",
    "android": "Mobile App Development",
    "flutter": "Mobile App Development",
    "app development": "Mobile App Development",
    # design
    "ui design": "UI Design",
    "ui/ux": "UI Design",
    "ux": "UI Design",
    "graphic design": "Graphic Design",
    "graphics": "Graphic Design",
    "visual design": "Graphic Design",
    # creative
    "photography": "Photography",
    "video editing": "Video Editing",
    "editing": "Video Editing",
    "film editing": "Video Editing",
    # communication
    "public speaking": "Public Speaking",
    "presentation": "Public Speaking",
    "presenting": "Public Speaking",
    "speaking": "Public Speaking",
    "writing": "Writing",
    "creative writing": "Writing",
    "content writing": "Writing",
    "blogging": "Writing",
    # music
    "guitar": "Guitar",
    "playing guitar": "Guitar",
    "piano": "Piano",
    "music": "Music",
    # misc
    "excel": "Excel",
    "spreadsheets": "Excel",
    "spanish": "Spanish",
    "ancient history": "Ancient History",
    "archaeology": "Archaeology",
    "philosophy": "Philosophy",
}


def normalize(name: str) -> str:
    """Return the canonical skill name for a raw input string."""
    key = " ".join(name.strip().lower().split())
    if key in ALIASES:
        return ALIASES[key]
    return name.strip().title()