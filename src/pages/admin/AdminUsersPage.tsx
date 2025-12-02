import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  CreditCard,
  AlertTriangle,
  Ban,
  Heart,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type UserType = {
  _id: Id<"users">;
  _creationTime: number;
  name: string;
  email: string;
  role: "user" | "admin";
  credits: number;
  isActive: boolean;
  suspendedUntil?: number;
  suspensionReason?: string;
};

export function AdminUsersPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [actionDialog, setActionDialog] = useState<"activate" | "deactivate" | "pardon" | null>(null);

  const users = useQuery(api.admin.getAllUsers, {
    sessionToken: sessionToken ?? "",
  });

  const toggleUserStatus = useMutation(api.admin.toggleUserStatus);
  const pardonUser = useMutation(api.admin.pardonUser);

  const filteredUsers = users?.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async () => {
    if (!selectedUser || !sessionToken) return;

    const result = await toggleUserStatus({
      sessionToken,
      userId: selectedUser._id,
      isActive: !selectedUser.isActive,
    });

    if (result) {
      toast({
        title: selectedUser.isActive ? "User Deactivated" : "User Activated",
        description: `${selectedUser.name} has been ${selectedUser.isActive ? "deactivated" : "activated"}.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    }

    setActionDialog(null);
    setSelectedUser(null);
  };

  const handlePardon = async () => {
    if (!selectedUser || !sessionToken) return;

    const result = await pardonUser({
      sessionToken,
      userId: selectedUser._id,
    });

    if (result) {
      toast({
        title: "Suspension Lifted",
        description: `${selectedUser.name}'s suspension has been lifted.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to pardon user.",
        variant: "destructive",
      });
    }

    setActionDialog(null);
    setSelectedUser(null);
  };

  const isSuspended = (user: UserType) => {
    return user.suspendedUntil && user.suspendedUntil > Date.now();
  };

  const formatSuspensionDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const stats = {
    total: users?.length ?? 0,
    active: users?.filter((u) => u.isActive).length ?? 0,
    suspended: users?.filter((u) => isSuspended(u)).length ?? 0,
    admins: users?.filter((u) => u.role === "admin").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage platform users</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Search and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          {user.credits}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {user.isActive ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 w-fit">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 w-fit">
                              Inactive
                            </Badge>
                          )}
                          {isSuspended(user) && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 w-fit">
                              <Ban className="mr-1 h-3 w-3" />
                              Suspended until {formatSuspensionDate(user.suspendedUntil!)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.role !== "admin" && isSuspended(user) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setActionDialog("pardon");
                              }}
                            >
                              <Heart className="mr-1 h-3 w-3" />
                              Pardon
                            </Button>
                          )}
                          {user.role !== "admin" && (
                            <Button
                              variant={user.isActive ? "outline" : "default"}
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setActionDialog(user.isActive ? "deactivate" : "activate");
                              }}
                            >
                              {user.isActive ? (
                                <>
                                  <UserX className="mr-1 h-3 w-3" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-1 h-3 w-3" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No users found matching your search" : "No users found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog === "deactivate" ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : actionDialog === "pardon" ? (
                <Heart className="h-5 w-5 text-green-500" />
              ) : (
                <UserCheck className="h-5 w-5 text-green-500" />
              )}
              {actionDialog === "deactivate" 
                ? "Deactivate User" 
                : actionDialog === "pardon"
                ? "Pardon User"
                : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === "deactivate"
                ? `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the platform.`
                : actionDialog === "pardon"
                ? `Are you sure you want to lift the suspension for ${selectedUser?.name}? They will be able to create requests and accept matches again.`
                : `Are you sure you want to activate ${selectedUser?.name}? They will be able to access the platform again.`}
            </DialogDescription>
            {actionDialog === "pardon" && selectedUser?.suspensionReason && (
              <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Original reason: </span>
                {selectedUser.suspensionReason}
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={actionDialog === "deactivate" ? "destructive" : "default"}
              onClick={actionDialog === "pardon" ? handlePardon : handleToggleStatus}
            >
              {actionDialog === "deactivate" 
                ? "Deactivate" 
                : actionDialog === "pardon"
                ? "Lift Suspension"
                : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
