CREATE TABLE eventTypes (
  name VARCHAR(100) PRIMARY KEY NOT NULL
);

INSERT INTO eventTypes(name) VALUES('shownProofOfKeys');

CREATE TABLE events (
  id         INTEGER       PRIMARY KEY AUTOINCREMENT NOT NULL,
  type       VARCHAR(100)  NOT NULL REFERENCES eventTypes(name),
  timestamp  DATETIME      NOT NULL DEFAULT current_timestamp
);
