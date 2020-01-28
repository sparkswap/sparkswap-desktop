CREATE TABLE trades_with_quotes (
  id                       INTEGER      PRIMARY KEY AUTOINCREMENT NOT NULL,
  hash                     BLOB         UNIQUE NOT NULL,
  preimage                 BLOB         UNIQUE,
  destinationAmountAsset   VARCHAR(5)   NOT NULL REFERENCES assets(symbol),
  destinationAmountUnit    VARCHAR(20)  NOT NULL REFERENCES units(unit),
  destinationAmountValue   INTEGER      NOT NULL,
  sourceAmountAsset        VARCHAR(5)   NOT NULL REFERENCES assets(symbol),
  sourceAmountUnit         VARCHAR(20)  NOT NULL REFERENCES units(unit),
  sourceAmountValue        INTEGER      NOT NULL,
  expiration               DATETIME     NOT NULL,
  startTime                DATETIME     DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  endTime                  DATETIME,
  failureCode              INTEGER
);

INSERT INTO trades_with_quotes (
  id,
  hash,
  preimage,
  destinationAmountAsset,
  destinationAmountUnit,
  destinationAmountValue,
  sourceAmountAsset,
  sourceAmountUnit,
  sourceAmountValue,
  expiration,
  startTime,
  endTime,
  failureCode
)
SELECT
  id,
  hash,
  preimage,
  destinationAmountAsset,
  destinationAmountUnit,
  destinationAmountValue,
  sourceAmountAsset,
  sourceAmountUnit,
  sourceAmountValue,
  -- while we don't have an exact expiration for legacy trades, we can
  -- estimate it as 5 seconds from the start time of the trade.
  strftime('%Y-%m-%dT%H:%M:%fZ', startTime, '+5 seconds') AS expiration,
  strftime('%Y-%m-%dT%H:%M:%fZ', startTime) AS startTime,
  strftime('%Y-%m-%dT%H:%M:%fZ', endTime) AS endTime,
  failureCode
FROM trades;

DROP TABLE trades;

ALTER TABLE trades_with_quotes RENAME TO trades;
