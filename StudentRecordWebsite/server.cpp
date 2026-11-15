#include "httplib.h"
#include "json.hpp"
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <cctype>
#include <cmath>

using json = nlohmann::json;
using namespace std;

const string DATA_FILE = "students.txt";
const string PUBLIC_DIR = "public";

struct Student {
    int rollNo;
    string name;
    float marks;
    float attendance;
};

string trim(const string& s) {
    size_t first = s.find_first_not_of(" \t\r\n");
    if (first == string::npos) return "";
    size_t last = s.find_last_not_of(" \t\r\n");
    return s.substr(first, last - first + 1);
}

bool validStudent(const string& name, float marks, float attendance, string& error) {
    if (trim(name).empty()) { error = "Name is required."; return false; }
    if (name.find(',') != string::npos) { error = "Name cannot contain commas because students.txt uses comma-separated records."; return false; }
    if (name.size() > 80) { error = "Name must be 80 characters or fewer."; return false; }
    if (!isfinite(marks) || marks < 0 || marks > 100) { error = "Marks must be between 0 and 100."; return false; }
    if (!isfinite(attendance) || attendance < 0 || attendance > 100) { error = "Attendance must be between 0 and 100."; return false; }
    return true;
}

vector<Student> loadStudents() {
    vector<Student> students;
    ifstream in(DATA_FILE);
    string line;
    while (getline(in, line)) {
        if (trim(line).empty()) continue;
        size_t p1 = line.find(',');
        size_t p2 = p1 == string::npos ? p1 : line.find(',', p1 + 1);
        size_t p3 = p2 == string::npos ? p2 : line.find(',', p2 + 1);
        if (p1 == string::npos || p2 == string::npos || p3 == string::npos) continue;
        try {
            int roll = stoi(line.substr(0, p1));
            string name = line.substr(p1 + 1, p2 - p1 - 1);
            float marks = stof(line.substr(p2 + 1, p3 - p2 - 1));
            float attendance = stof(line.substr(p3 + 1));
            string error;
            bool duplicate = any_of(students.begin(), students.end(), [roll](const Student& s){ return s.rollNo == roll; });
            if (roll > 0 && !duplicate && validStudent(name, marks, attendance, error))
                students.push_back({roll, trim(name), marks, attendance});
        } catch (...) { /* Ignore malformed lines */ }
    }
    return students;
}

bool saveStudents(const vector<Student>& students) {
    ofstream out(DATA_FILE, ios::trunc);
    if (!out) return false;
    for (const auto& s : students)
        out << s.rollNo << ',' << s.name << ',' << s.marks << ',' << s.attendance << '\n';
    return static_cast<bool>(out);
}

json toJson(const Student& s) {
    return {{"rollNo", s.rollNo}, {"name", s.name}, {"marks", s.marks}, {"attendance", s.attendance}};
}

void sendError(httplib::Response& res, int status, const string& message) {
    res.status = status;
    res.set_content(json{{"error", message}}.dump(), "application/json; charset=utf-8");
}

int main() {
    httplib::Server server;

    server.Get("/api/students", [](const httplib::Request&, httplib::Response& res) {
        auto students = loadStudents();
        json result = json::array();
        for (const auto& s : students) result.push_back(toJson(s));
        res.set_content(result.dump(), "application/json; charset=utf-8");
    });

    server.Post("/api/students", [](const httplib::Request& req, httplib::Response& res) {
        json body;
        try { body = json::parse(req.body); }
        catch (...) { sendError(res, 400, "Request body must be valid JSON."); return; }

        int roll; string name; float marks, attendance;
        try {
            roll = body.at("rollNo").get<int>();
            name = trim(body.at("name").get<string>());
            marks = body.at("marks").get<float>();
            attendance = body.at("attendance").get<float>();
        } catch (...) { sendError(res, 400, "Please provide roll number, name, marks and attendance."); return; }

        if (roll <= 0) { sendError(res, 400, "Roll number must be a positive integer."); return; }
        string error;
        if (!validStudent(name, marks, attendance, error)) { sendError(res, 400, error); return; }

        auto students = loadStudents();
        if (any_of(students.begin(), students.end(), [roll](const Student& s){ return s.rollNo == roll; })) {
            sendError(res, 409, "That roll number already exists."); return;
        }
        students.push_back({roll, name, marks, attendance});
        if (!saveStudents(students)) { sendError(res, 500, "Could not save students.txt. Check folder permissions."); return; }
        res.status = 201;
        res.set_content(toJson(students.back()).dump(), "application/json; charset=utf-8");
    });

    server.Put(R"(/api/students/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        int roll = 0;
        try { roll = stoi(req.matches[1]); } catch (...) { sendError(res, 400, "Invalid roll number."); return; }
        json body;
        try { body = json::parse(req.body); }
        catch (...) { sendError(res, 400, "Request body must be valid JSON."); return; }

        string name; float marks, attendance;
        try {
            name = trim(body.at("name").get<string>());
            marks = body.at("marks").get<float>();
            attendance = body.at("attendance").get<float>();
        } catch (...) { sendError(res, 400, "Please provide name, marks and attendance."); return; }

        string error;
        if (!validStudent(name, marks, attendance, error)) { sendError(res, 400, error); return; }
        auto students = loadStudents();
        auto it = find_if(students.begin(), students.end(), [roll](const Student& s){ return s.rollNo == roll; });
        if (it == students.end()) { sendError(res, 404, "Student record not found."); return; }
        it->name = name; it->marks = marks; it->attendance = attendance;
        if (!saveStudents(students)) { sendError(res, 500, "Could not save students.txt. Check folder permissions."); return; }
        res.set_content(toJson(*it).dump(), "application/json; charset=utf-8");
    });

    server.Delete(R"(/api/students/(\d+))", [](const httplib::Request& req, httplib::Response& res) {
        int roll = 0;
        try { roll = stoi(req.matches[1]); } catch (...) { sendError(res, 400, "Invalid roll number."); return; }
        auto students = loadStudents();
        auto oldSize = students.size();
        students.erase(remove_if(students.begin(), students.end(), [roll](const Student& s){ return s.rollNo == roll; }), students.end());
        if (students.size() == oldSize) { sendError(res, 404, "Student record not found."); return; }
        if (!saveStudents(students)) { sendError(res, 500, "Could not save students.txt. Check folder permissions."); return; }
        res.set_content(json{{"message", "Student deleted."}}.dump(), "application/json; charset=utf-8");
    });

    server.set_mount_point("/", PUBLIC_DIR);

    
const char* portEnv = std::getenv("PORT");
int port = 8081;

if (portEnv && *portEnv) {
    try {
        port = std::stoi(portEnv);
    } catch (...) {
        cerr << "Invalid PORT environment variable.\n";
        return 1;
    }
}

cout << "Student Record Management System running on port "
     << port << endl;

if (!server.listen("0.0.0.0", port)) {
    cerr << "Could not start server on port " << port << endl;
    return 1;
}



    return 0;
}
