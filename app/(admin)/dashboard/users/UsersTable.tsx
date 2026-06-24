"use client";
import { useState, useEffect } from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function UsersTable() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
        const usersData = await response.json();
        setUsers(usersData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user: any) => {
    const matchesSearch =
      user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uniqueRoles = Array.from(new Set(users.map((user: any) => user.role)));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all registered users</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Total: {filteredUsers.length} users</div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
          Loading users data...
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Users</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, phone..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div>
          <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Role</label>
          <SearchableSelect
            id="role-filter"
            value={selectedRole}
            onChange={(val) => { setSelectedRole(val); setCurrentPage(1); }}
            options={[
              { value: "all", label: "All Roles" },
              ...uniqueRoles.map((role: string) => ({ value: role, label: role ? role.charAt(0).toUpperCase() + role.slice(1) : "—" })),
            ]}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setSearchTerm(""); setSelectedRole("all"); setCurrentPage(1); }}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {["User", "Contact", "Role & Status", "Details", "Joined"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {currentUsers.length > 0 ? (
                currentUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.name} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                              <span className="text-brand-600 dark:text-brand-300 font-medium">{user.name?.charAt(0).toUpperCase() || "U"}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name || "No Name"}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                      {user.phone && <div className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "admin" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : user.role === "tutor" ? "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-300"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"}`}>
                        {user.role?.toUpperCase() || "USER"}
                      </span>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{user.profile_setup ? "Profile Complete" : "Setup Pending"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.is_tutor ? (
                          <div>
                            <span className="font-medium">Tutor</span>
                            {user.hourlyRate && <div className="text-green-600 dark:text-green-400">${user.hourlyRate}/hr</div>}
                          </div>
                        ) : ("Student/Learner")}
                      </div>
                      {user.bio && <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{user.bio}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-lg font-medium">No users found</p>
                    <p className="mt-2">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length > itemsPerPage && (
        <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{" "}
            <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{" "}
            <span className="font-medium">{filteredUsers.length}</span> results
          </p>
          <nav className="inline-flex rounded-md shadow-sm -space-x-px">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
              className="px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-50">Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => handlePageChange(page)}
                className={`px-4 py-2 border text-sm font-medium ${currentPage === page
                  ? "z-10 bg-brand-50 dark:bg-brand-900 border-brand-500 text-brand-600 dark:text-brand-300"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"}`}>{page}</button>
            ))}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 disabled:opacity-50">Next</button>
          </nav>
        </div>
      )}
    </div>
  );
}
