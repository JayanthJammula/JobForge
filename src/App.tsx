import { useState } from "react";
import { Header } from "./components/Header";
import { JobsPage } from "./components/JobsPage";
import { JobDetailPage } from "./components/JobDetailPage";
import { MockInterviewPage } from "./components/MockInterviewPage";
import { LearningPathPage } from "./components/LearningPathPage";
import { ResumePage } from "./components/ResumePage";
import { ProfilePage } from "./components/ProfilePage";
import { TailorResumePage } from "./components/TailorResumePage";
import { SmartMatchPage } from "./components/SmartMatchPage";
import { CodingChallengePage } from "./components/CodingChallengePage";
import { PulseDashboardPage } from "./components/PulseDashboardPage";
import { ErrorBoundary } from "./components/ErrorBoundary";

type Page =
  | "jobs"
  | "job-detail"
  | "mock-interview"
  | "learning-path"
  | "resume"
  | "profile"
  | "tailor-resume"
  | "smart-match"
  | "coding-challenge"
  | "pulse-dashboard";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("jobs");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobData, setSelectedJobData] = useState<any>(null);
  const [cachedJobs, setCachedJobs] = useState<any[]>([]);

  const handleJobClick = (jobId: string, jobData?: any) => {
    setSelectedJobId(jobId);
    setSelectedJobData(jobData);
    setCurrentPage("job-detail");
  };

  const handleStartInterview = (jobId: string, jobData?: any) => {
    setSelectedJobId(jobId);
    setSelectedJobData(jobData);
    setCurrentPage("mock-interview");
  };

  const handleInterviewComplete = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentPage("learning-path");
  };

  const handleBackToJobs = () => {
    setCurrentPage("jobs");
    setSelectedJobId(null);
    setSelectedJobData(null);
  };

  const handleBackToJobDetail = () => {
    setCurrentPage("job-detail");
  };

  const handleRetakeInterview = (jobId: string) => {
    setSelectedJobId(jobId);
    setCurrentPage("mock-interview");
  };

  const handleGoToProfile = () => {
    setCurrentPage("profile");
  };

  const handleGoToResume = () => {
    setCurrentPage("resume");
  };

  const handleTailorResume = (jobId: string, jobData?: any) => {
    setSelectedJobId(jobId);
    setSelectedJobData(jobData);
    setCurrentPage("tailor-resume");
  };

  const handleGoToSmartMatch = () => {
    setCurrentPage("smart-match");
  };

  const handleGoToPulse = () => {
    setCurrentPage("pulse-dashboard");
  };

  const handleStartCodingChallenge = (jobId: string, jobData?: any) => {
    setSelectedJobId(jobId);
    setSelectedJobData(jobData);
    setCurrentPage("coding-challenge");
  };

  return (
    <ErrorBoundary onReset={handleBackToJobs}>
    <div className="min-h-screen flex flex-col">
      {currentPage === "jobs" && (
        <Header
          onProfileClick={handleGoToProfile}
          onSmartMatchClick={handleGoToSmartMatch}
          onPulseClick={handleGoToPulse}
        />
      )}

      <main className="flex-1">
        {currentPage === "jobs" && (
          <JobsPage onJobClick={handleJobClick} cachedJobs={cachedJobs} onJobsFetched={setCachedJobs} />
        )}

        {currentPage === "job-detail" && selectedJobId && (
          <JobDetailPage
            jobId={selectedJobId}
            jobData={selectedJobData}
            onBack={handleBackToJobs}
            onStartInterview={handleStartInterview}
            onTailorResume={handleTailorResume}
            onStartCodingChallenge={handleStartCodingChallenge}
          />
        )}

        {currentPage === "mock-interview" && selectedJobId && (
          <MockInterviewPage
            jobId={selectedJobId}
            jobData={selectedJobData}
            onBack={handleBackToJobDetail}
            onComplete={handleInterviewComplete}
          />
        )}

        {currentPage === "learning-path" && selectedJobId && (
          <LearningPathPage
            jobId={selectedJobId}
            onBack={handleBackToJobDetail}
            onRetakeInterview={handleRetakeInterview}
          />
        )}

        {currentPage === "profile" && (
          <ProfilePage
            onBack={handleBackToJobs}
            onEditResume={handleGoToResume}
          />
        )}

        {currentPage === "resume" && (
          <ResumePage onBack={handleGoToProfile} />
        )}

        {currentPage === "tailor-resume" && selectedJobId && (
          <TailorResumePage
            jobId={selectedJobId}
            jobData={selectedJobData}
            onBack={handleBackToJobDetail}
          />
        )}

        {currentPage === "pulse-dashboard" && (
          <PulseDashboardPage onBack={handleBackToJobs} />
        )}

        {currentPage === "smart-match" && (
          <SmartMatchPage
            onBack={handleBackToJobs}
            onGoToProfile={handleGoToProfile}
          />
        )}

        {currentPage === "coding-challenge" && selectedJobId && (
          <CodingChallengePage
            jobId={selectedJobId}
            jobData={selectedJobData}
            onBack={handleBackToJobDetail}
          />
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}
