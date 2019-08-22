CREATE TABLE assets (
  symbol  VARCHAR(5)  PRIMARY KEY NOT NULL
);

INSERT INTO assets(symbol) VALUES('BTC');
INSERT INTO assets(symbol) VALUES('USDX');

CREATE TABLE units (
  asset VARCHAR(5)   NOT NULL REFERENCES assets(symbol),
  unit  VARCHAR(20)  PRIMARY KEY NOT NULL
);

INSERT INTO units(asset, unit) VALUES('BTC', 'satoshi');
INSERT INTO units(asset, unit) VALUES('USDX', 'cent');

CREATE TABLE trades (
  id                       INTEGER      PRIMARY KEY AUTOINCREMENT NOT NULL,
  hash                     BLOB         UNIQUE NOT NULL,
  preimage                 BLOB         UNIQUE,
  destinationAmountAsset   VARCHAR(5)   NOT NULL REFERENCES assets(symbol),
  destinationAmountUnit    VARCHAR(20)  NOT NULL REFERENCES units(unit),
  destinationAmountValue   INTEGER      NOT NULL,
  sourceAmountAsset        VARCHAR(5)   NOT NULL REFERENCES assets(symbol),
  sourceAmountUnit         VARCHAR(20)  NOT NULL REFERENCES units(unit),
  sourceAmountValue        INTEGER      NOT NULL,
  startTime                DATETIME     DEFAULT current_timestamp,
  endTime                  DATETIME,
  failureCode              INTEGER
);
