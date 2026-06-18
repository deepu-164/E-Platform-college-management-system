import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Star, Building2, IndianRupee, Filter } from "lucide-react";
import { apiGet, type ApiItemResponse, type ApiListResponse } from "@/lib/api";

type College = {
  id: string;
  name: string;
  location: string;
  rating: number;
  rank: number;
  type: string;
  feesPerYear: number;
  courses: { id: string; name: string }[];
};

type FilterMeta = {
  locations: { value: string; count: number }[];
  types: { value: string; count: number }[];
  topCities: { value: string; count: number }[];
};

const PAGE_SIZE = 5000;

export default function Colleges() {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [alphabetFilter, setAlphabetFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [colleges, setColleges] = useState<College[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<FilterMeta>({ locations: [], types: [], topCities: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMeta = async () => {
      const response = await apiGet<ApiItemResponse<FilterMeta>>("/colleges/meta");
      setMeta(response.item);
    };

    void loadMeta();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, locationFilter, typeFilter, alphabetFilter]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiGet<ApiListResponse<College>>("/colleges", {
          search: search || undefined,
          location: locationFilter === "all" ? undefined : locationFilter,
          type: typeFilter === "all" ? undefined : typeFilter,
          startsWith: alphabetFilter === "all" ? undefined : alphabetFilter,
          page,
          limit: PAGE_SIZE
        });

        setColleges(data.items);
        setTotal(data.meta?.total ?? data.items.length);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [search, locationFilter, typeFilter, page, alphabetFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Explore Colleges</h1>
        <p className="text-muted-foreground mt-1">Find the right college for your goals</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search colleges or courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {meta.locations.map((location) => (
              <SelectItem key={location.value} value={location.value}>{location.value} ({location.count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {meta.types.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.value} ({type.count})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <p className="text-xs text-muted-foreground mb-2">Quick City Filters</p>
        <div className="flex flex-wrap gap-2">
          <Button variant={locationFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setLocationFilter("all")}>All Cities</Button>
          {meta.topCities.map((item) => (
            <Button key={item.value} variant={locationFilter === item.value ? "default" : "outline"} size="sm" onClick={() => setLocationFilter(item.value)}>
              {item.value} ({item.count})
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <p className="text-xs text-muted-foreground mb-2">Browse By A-Z</p>
        <div className="flex flex-wrap gap-2">
          <Button variant={alphabetFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setAlphabetFilter("all")}>All</Button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <Button key={letter} variant={alphabetFilter === letter ? "default" : "outline"} size="sm" onClick={() => setAlphabetFilter(letter)}>{letter}</Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {loading ? "Loading colleges..." : `${total} total colleges (page ${page}/${totalPages})`}
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {colleges.map((college) => (
          <div key={college.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-card-hover transition-all group h-full">
            <Link to={`/colleges/${college.id}`} className="block">
              <div className="w-full h-28 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">#{college.rank} Rank</span>
                <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">{college.type}</span>
              </div>
              <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{college.name}</h3>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {college.location}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {college.courses.slice(0, 3).map((course) => (
                  <span key={course.id} className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{course.name}</span>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-warning fill-warning" />
                  <span className="text-sm font-medium">{college.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <IndianRupee className="h-3.5 w-3.5" /> {(college.feesPerYear / 100000).toFixed(1)}L/yr
                </div>
              </div>
            </Link>

            <div className="mt-4 flex gap-2">
              <Link to={`/colleges/${college.id}`} className="flex-1">
                <Button variant="outline" className="w-full">View Details</Button>
              </Link>
              <Link to={`/applications/new?type=college&collegeId=${college.id}`} className="flex-1">
                <Button className="w-full gradient-primary text-primary-foreground border-0">Apply</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!loading && total > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>Previous</Button>
          <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
          <Button variant="outline" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {!loading && colleges.length === 0 && (
        <p className="text-sm text-muted-foreground mt-6 text-center">No colleges found for the current filters.</p>
      )}
    </DashboardLayout>
  );
}
