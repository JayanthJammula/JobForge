import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { MarketOverviewCards } from "./pulse/MarketOverviewCards";
import { SkillTrendsChart } from "./pulse/SkillTrendsChart";
import { SalaryBenchmarkChart } from "./pulse/SalaryBenchmarkChart";
import { CompanyVelocityTable } from "./pulse/CompanyVelocityTable";
import { LocationDemandView } from "./pulse/LocationDemandView";
import { EmergingSkillsBadges } from "./pulse/EmergingSkillsBadges";
import {
  fetchMarketOverview,
  fetchSkillTrends,
  fetchSalaryBenchmarks,
  fetchCompanyVelocity,
  fetchLocationDemand,
  fetchEmergingSkills,
  triggerETL,
  type MarketOverview,
  type SkillTrend,
  type SalaryBenchmark,
  type CompanyVelocity,
  type LocationDemand,
} from "../services/pulseApi";

interface Props {
  onBack: () => void;
}

export function PulseDashboardPage({ onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [etlLoading, setEtlLoading] = useState(false);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [skillTrends, setSkillTrends] = useState<SkillTrend[]>([]);
  const [salaries, setSalaries] = useState<SalaryBenchmark[]>([]);
  const [companies, setCompanies] = useState<CompanyVelocity[]>([]);
  const [locations, setLocations] = useState<LocationDemand[]>([]);
  const [emerging, setEmerging] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, sk, sal, comp, loc, em] = await Promise.all([
        fetchMarketOverview(),
        fetchSkillTrends(),
        fetchSalaryBenchmarks(),
        fetchCompanyVelocity(),
        fetchLocationDemand(),
        fetchEmergingSkills(),
      ]);
      setOverview(ov);
      setSkillTrends(sk);
      setSalaries(sal);
      setCompanies(comp);
      setLocations(loc);
      setEmerging(em);
    } catch (e: any) {
      setError(e.message || "Failed to load market data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerETL = async () => {
    setEtlLoading(true);
    try {
      await triggerETL();
      // Wait a bit then reload
      setTimeout(() => {
        loadData();
        setEtlLoading(false);
      }, 3000);
    } catch {
      setEtlLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Market Pulse</h1>
            <p className="text-sm text-muted-foreground">
              Real-time job market intelligence
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleTriggerETL} disabled={etlLoading}>
            {etlLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {etlLoading ? "Fetching Jobs..." : "Fetch New Data"}
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading market data...</span>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-destructive mb-4">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">
            Make sure PostgreSQL is running and the ETL pipeline has been triggered at least once.
          </p>
          <Button onClick={handleTriggerETL} disabled={etlLoading}>
            {etlLoading ? "Fetching..." : "Fetch Job Data Now"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          {overview && (
            <MarketOverviewCards
              totalJobs={overview.total_jobs}
              totalCompanies={overview.total_companies}
              avgSalary={overview.avg_salary}
              totalRemote={overview.total_remote}
            />
          )}

          {/* Emerging Skills */}
          <EmergingSkillsBadges skills={emerging} />

          {/* Tabbed Content */}
          <Tabs defaultValue="skills" className="space-y-4">
            <TabsList>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="salaries">Salaries</TabsTrigger>
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
            </TabsList>

            <TabsContent value="skills">
              <SkillTrendsChart trends={skillTrends} />
            </TabsContent>

            <TabsContent value="salaries">
              <SalaryBenchmarkChart benchmarks={salaries} />
            </TabsContent>

            <TabsContent value="companies">
              <CompanyVelocityTable companies={companies} />
            </TabsContent>

            <TabsContent value="locations">
              <LocationDemandView locations={locations} />
            </TabsContent>
          </Tabs>

          {/* Top Skills Quick View */}
          {overview && overview.top_skills.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Last updated: {overview.last_updated}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
