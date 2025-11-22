"use client";

import { mockApplicants, mockJobs } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Check, X, PlayCircle, FileText, MoreHorizontal, Filter, ArrowUpDown, Sparkles, BrainCircuit, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Avatar placeholder URLs
const avatars = [
  'https://ui-avatars.com/api/?name=Sarah+J&background=10b981&color=fff&size=256',
  'https://ui-avatars.com/api/?name=Michael+C&background=f59e0b&color=fff&size=256',
  'https://ui-avatars.com/api/?name=Emily+R&background=ec4899&color=fff&size=256',
  'https://ui-avatars.com/api/?name=David+K&background=8b5cf6&color=fff&size=256',
];

export default function HRApplicantDetail() {
  const params = useParams();
  const jobId = params?.id as string;
  const job = mockJobs.find(j => j.id === jobId) || mockJobs[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 px-4 py-8">
       {/* Header Section */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="flex items-center gap-4">
          <Link href="/hr/jobs">
            <Button variant="ghost" size="icon" className="h-10 w-10 -ml-2 rounded-full hover:bg-secondary">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-semibold tracking-tight text-foreground">Applicants</h1>
               <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-normal">
                 <BrainCircuit className="h-3 w-3 mr-1" /> AI Scoring Active
               </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Reviewing candidates for <span className="text-foreground font-medium">{job.title}</span></p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-border bg-secondary/50 hover:bg-secondary">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" className="gap-2 border-border bg-secondary/50 hover:bg-secondary">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* AI Summary Card */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Top Pick</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-blue-500/30 bg-emerald-500/20 flex items-center justify-center">
               <span className="text-sm font-medium text-emerald-400">SJ</span>
            </div>
            <div>
               <div className="text-sm font-bold text-foreground">Sarah Jenkins</div>
               <div className="text-xs text-blue-400">98% Match Score</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            &quot;Sarah demonstrates exceptional React knowledge and strong leadership potential based on her video responses.&quot;
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
           <div className="text-xs font-medium text-muted-foreground mb-1">Average Match Score</div>
           <div className="text-2xl font-bold text-foreground">85%</div>
           <div className="w-full bg-secondary/50 h-1.5 rounded-full mt-3 overflow-hidden">
             <div className="bg-blue-500 h-full w-[85%]" />
           </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
           <div className="text-xs font-medium text-muted-foreground mb-1">Time to Hire</div>
           <div className="text-2xl font-bold text-foreground">12 Days</div>
           <div className="text-xs text-green-500 mt-1 font-medium flex items-center gap-1">
             <ArrowUpDown className="h-3 w-3" /> 15% faster than average
           </div>
        </div>
      </div>

      {/* Applicants Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xl shadow-black/10 dark:shadow-black/20">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="w-[300px] h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground pl-6">Candidate</TableHead>
              <TableHead className="h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Analysis</TableHead>
              <TableHead className="h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">Match Score</TableHead>
              <TableHead className="h-12 text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="h-12 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockApplicants.map((applicant, i) => (
              <TableRow key={applicant.id} className="group hover:bg-secondary/30 border-border transition-colors">
                <TableCell className="pl-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border border-border group-hover:border-blue-500/30 transition-colors">
                       <img src={avatars[i % avatars.length]} alt={applicant.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">{applicant.name}</div>
                      <div className="text-xs text-muted-foreground">{applicant.role}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5 w-32">
                     <div className="flex justify-between text-[10px] text-muted-foreground">
                       <span>Tech</span>
                       <span className="text-foreground">High</span>
                     </div>
                     <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 rounded-full" style={{ width: `${70 + (i * 5) % 30}%` }} />
                     </div>
                     <div className="flex justify-between text-[10px] text-muted-foreground">
                       <span>Culture</span>
                       <span className="text-foreground">Med</span>
                     </div>
                     <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-purple-500 rounded-full" style={{ width: `${60 + (i * 7) % 30}%` }} />
                     </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 flex items-center justify-center">
                       <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                          <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path
                            className={`${applicant.matchScore > 85 ? 'text-green-500' : 'text-amber-500'}`}
                            strokeDasharray={`${applicant.matchScore}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                       </svg>
                       <span className="absolute text-[10px] font-bold">{applicant.matchScore}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`px-2.5 py-0.5 text-xs font-medium border ${
                    applicant.status === 'approved'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : applicant.status === 'rejected'
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="sm" variant="secondary" className="h-8 w-8 p-0 hover:bg-foreground hover:text-background transition-colors">
                       <PlayCircle className="h-4 w-4" />
                     </Button>
                     <div className="w-px h-4 bg-border/50 mx-1 self-center" />
                     <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 hover:bg-green-500/10">
                       <Check className="h-4 w-4" />
                     </Button>
                     <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10">
                       <X className="h-4 w-4" />
                     </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
