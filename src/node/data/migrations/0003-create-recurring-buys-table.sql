CREATE TABLE timeUnit (
    unit  VARCHAR(5)  PRIMARY KEY NOT NULL
);

INSERT INTO timeUnit(unit) VALUES('MINUTES');
INSERT INTO timeUnit(unit) VALUES('HOURS');
INSERT INTO timeUnit(unit) VALUES('DAYS');
INSERT INTO timeUnit(unit) VALUES('WEEKS');
INSERT INTO timeUnit(unit) VALUES('MONTHS');

CREATE TABLE recurringBuys (
  id                       INTEGER      PRIMARY KEY AUTOINCREMENT NOT NULL,
  amountAsset              VARCHAR(5)   NOT NULL REFERENCES assets(symbol),
  amountUnit               VARCHAR(20)  NOT NULL REFERENCES units(unit),
  amountValue              INTEGER      NOT NULL,
  duration                 INTEGER      NOT NULL,
  timeUnit                 VARCHAR(5)   NOT NULL REFERENCES timeUnit(unit),
  referenceTime            DATETIME     NOT NULL
);

