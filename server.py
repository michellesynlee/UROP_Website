from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('home.html')


@app.route("/movement")
def movement():
    return render_template("movement.html")  

@app.route("/spirit")
def spirit():
    return render_template("spirit.html")  

@app.route("/youth")
def youth():
    return render_template("youth.html")  

@app.route("/research")
def research():
    return render_template("research.html")  

@app.route("/nutrition")
def nutrition():
    return render_template("nutrition.html")  

@app.route("/calendar")
def calendar_page():
    return render_template("calendar.html")

if __name__ == '__main__':
    app.run(debug=True)