-- What a knowledge space is about, so Khám phá can be browsed instead of only
-- searched.
--
-- Until now discovery matched on name and description alone, which means a
-- member has to already know what they are looking for — the opposite of
-- exploring. Topics give the page something to group by.
--
-- A row per pair rather than a column on workspaces: a group on MongoDB is
-- both a database group and a programming group, and a single column would
-- file it under whichever its owner picked first. Capped at three per
-- workspace by the application, not here, because the cap is a product
-- judgement that will be argued about and a CHECK would make each argument a
-- schema migration.
--
-- No CHECK on the topic value either, deliberately. The vocabulary lives in
-- the WorkspaceTopic enum and is expected to grow; constraining it here would
-- turn every new subject into a migration against the shared development
-- database, which is this project's most error-prone operation — five version
-- collisions so far. Values are validated at the API boundary and written
-- through the enum, so nothing else reaches the column from this application.
--
-- Numbered 43. Confirmed against flyway_schema_history on the shared database,
-- where 42 is this tree's reaction set, already applied.
CREATE TABLE IF NOT EXISTS workspace_topics (
    workspace_id UUID        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    topic        VARCHAR(40) NOT NULL,
    PRIMARY KEY (workspace_id, topic)
);

-- Serves the topic filter on Khám phá, which reads the other way round from
-- the primary key: given a topic, find the workspaces.
CREATE INDEX IF NOT EXISTS idx_workspace_topics_topic
    ON workspace_topics (topic);
