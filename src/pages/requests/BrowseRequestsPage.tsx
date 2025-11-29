import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Clock, CreditCard, Repeat } from "lucide-react";

export function BrowseRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const openRequests = useQuery(api.requests.getOpenRequests, { limit: 50 });
  const searchResults = useQuery(
    api.requests.searchRequests,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );

  const requests = searchQuery.length >= 2 ? searchResults : openRequests;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Browse Requests</h1>
          <p className="text-muted-foreground">
            Find service requests that match your skills
          </p>
        </div>
        <Link to="/requests/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, description, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Request List */}
      {requests && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Link key={request._id} to={`/requests/${request._id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">
                          {request.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {request.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{request.skillNeeded}</Badge>
                        <Badge
                          variant={
                            request.exchangeMode === "credit"
                              ? "default"
                              : "secondary"
                          }
                          className="gap-1"
                        >
                          {request.exchangeMode === "credit" ? (
                            <>
                              <CreditCard className="h-3 w-3" />
                              {request.creditAmount} credits
                            </>
                          ) : (
                            <>
                              <Repeat className="h-3 w-3" />
                              Skill: {request.skillOffered}
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDate(request._creationTime)}
                      </div>
                      <Link
                        to={`/users/${request.requesterId}`}
                        className="text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        by {request.requesterName}
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No requests found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Be the first to create a service request!"}
            </p>
            <Link to="/requests/new">
              <Button>Create a Request</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

