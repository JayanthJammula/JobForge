import { MapPin, DollarSign, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import type { LocationDemand } from "../../services/pulseApi";

interface Props {
  locations: LocationDemand[];
}

export function LocationDemandView({ locations }: Props) {
  if (!locations.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Demand by Location</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No location data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demand by Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((loc) => (
            <div key={loc.location} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{loc.location}</span>
                </div>
                <Badge variant="secondary">{loc.job_count} jobs</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                {loc.avg_salary ? (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Avg ${Math.round(loc.avg_salary).toLocaleString()}
                  </span>
                ) : null}
                {loc.remote_count > 0 && (
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3" />
                    {loc.remote_count} remote
                  </span>
                )}
              </div>
              {loc.top_skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {loc.top_skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
