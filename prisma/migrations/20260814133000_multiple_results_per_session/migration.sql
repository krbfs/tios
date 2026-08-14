-- DropIndex
DROP INDEX "test_results_session_id_key";

-- CreateIndex
CREATE INDEX "test_results_session_id_idx" ON "test_results"("session_id");
