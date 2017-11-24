drop table if exists projects;
drop table if exists activities;

create table projects(
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    name VARCHAR(1024)
);

create table activities(
    id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
    project INT,
    text VARCHAR(1024),
    status VARCHAR(16),
    weblink VARCHAR(256),
    dateDue DATE,
    dateCreated DATE,
    dateMarkedDone DATE
);
