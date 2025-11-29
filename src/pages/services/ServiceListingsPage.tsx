import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Briefcase, Pencil } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function ServiceListingsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { userId } = useAuthStore();

  const listings = useQuery(api.serviceListings.getActiveListings, { limit: 50 });
  const searchResults = useQuery(
    api.serviceListings.searchListings,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );

  const displayListings = searchQuery.length >= 2 ? searchResults : listings;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Service Listings</h1>
          <p className="text-muted-foreground">Browse services offered by the community</p>
        </div>
        <Link to="/services/my">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            My Services
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {displayListings && displayListings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayListings.map((listing) => (
            <Card key={listing._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{listing.title}</h3>
                  {userId && listing.userId === userId && (
                    <Link to="/services/my">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Edit service"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {listing.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{listing.skillRequired}</Badge>
                  <Badge>
                    {listing.exchangeMode === "credit"
                      ? `${listing.creditAmount} credits`
                      : listing.exchangeMode === "skill_swap"
                      ? "Skill Swap"
                      : "Both"}
                  </Badge>
                </div>
                <Link
                  to={`/users/${listing.userId}`}
                  className="text-sm text-primary hover:underline"
                >
                  by {listing.userName}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No services found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

