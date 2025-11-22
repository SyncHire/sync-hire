"use client";

import { mockJobs } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Clock, MapPin, DollarSign, Video, Type, Code, Plus, Trash2, MoreHorizontal, Wand2, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function HRJDDetail() {
  const params = useParams();
  const job = mockJobs.find(j => j.id === params?.id) || mockJobs[0];
  const [questions, setQuestions] = useState(job.questions);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 px-4 py-8">

      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-8">
        <Link href="/hr/jobs">
          <Button variant="ghost" className="pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground w-fit -ml-3 h-auto py-0 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{job.title}</h1>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 font-normal px-2.5 py-0.5">
                 Active
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> {job.location}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> {job.salary}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> {job.type}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="h-10 px-5 border-border bg-secondary/50 hover:bg-secondary">Edit Job</Button>
             <Link href={`/hr/applicants/${job.id}`}>
               <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 border-0">
                 View Applicants ({job.applicantsCount})
               </Button>
             </Link>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="h-11 bg-secondary/30 p-1 border border-border">
            <TabsTrigger value="details" className="text-sm h-9 px-6">Details</TabsTrigger>
            <TabsTrigger value="questions" className="text-sm h-9 px-6">AI Interview</TabsTrigger>
            <TabsTrigger value="settings" className="text-sm h-9 px-6">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="space-y-8 animate-in fade-in duration-300">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-8">
              <div className="space-y-4 p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground">About the Role</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground">Requirements</h3>
                <ul className="space-y-3">
                  {job.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      </div>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
               <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 via-transparent to-transparent border border-purple-500/20">
                  <div className="flex items-center gap-2 text-purple-400 font-medium mb-4">
                    <BrainCircuit className="h-5 w-5" /> AI Insights
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Our AI predicts this role will take <span className="text-foreground font-bold">14 days</span> to fill. We recommend adding 2 more technical questions to improve candidate filtering.
                  </p>
                  <Button size="sm" variant="secondary" className="w-full text-xs">View Market Data</Button>
               </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center p-6 rounded-xl bg-secondary/20 border border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Interview Configuration
                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">AI POWERED</Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Questions asked by the AI interviewer during the video session.</p>
            </div>
            <div className="flex gap-3">
               <Button size="sm" variant="outline" className="gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                 <Wand2 className="h-3.5 w-3.5" /> Generate with AI
               </Button>
               <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-foreground text-background hover:bg-foreground/90"><Plus className="h-3.5 w-3.5" /> Add Question</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Question</DialogTitle>
                  </DialogHeader>
                  {/* Dialog content */}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4">
            {questions.map((q, i) => (
              <div key={q.id} className="group flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-sm font-bold text-muted-foreground mt-0.5 border border-border group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-base font-medium text-foreground leading-relaxed">{q.text}</p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px] h-5 px-2 font-medium text-muted-foreground border-border bg-secondary/50 group-hover:border-blue-500/20 group-hover:text-blue-400 transition-colors">
                       {q.type.toUpperCase()} RESPONSE
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {q.duration} min
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
           {/* Settings Content */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
