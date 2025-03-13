import {
  FileText,
  Search,
  MessageSquare,
  Clock,
  BarChart2,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocumentItem } from "@/components/dashboard/DocumentItem"
import { RecentActivityItem } from "@/components/dashboard/RecentActivityItem"
import { StatCard } from "@/components/dashboard/StatCard"
import { DeadlineItem } from "@/components/dashboard/DeadlineItem"
import { QuickActionButton } from "@/components/dashboard/QuickActionButton"
import { InsightItem } from "@/components/dashboard/InsightItem"

export default function Dashboard() {
  return (
    
    <div className="flex min-h-screen flex-col bg-black text-wrap">
      <main className="flex-1 p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-2xl font-medium text-white">Welcome back</h1>
              <p className="text-sm text-zinc-400">Your legal workspace overview</p>
            </div>
            <Button className="h-8 bg-white text-black hover:bg-zinc-200 mt-2 sm:mt-0">
              <FileText className="mr-2 h-3.5 w-3.5" /> Create Document
            </Button>
          </div>
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-sm font-medium text-white">Quick Actions</h2>
            <div className="flex flex-col space-y-2">
              <QuickActionButton
                title="Create a Document"
                description="Generate legal documents with guidance"
                icon={<FileText className="h-4 w-4 text-blue-400" />}
              />
              <QuickActionButton
                title="Check a Contract"
                description="Get a simple explanation of any agreement"
                icon={<Search className="h-4 w-4 text-amber-400" />}
              />
              <QuickActionButton
                title="Ask a Legal Question"
                description="Chat with our AI legal assistant"
                icon={<MessageSquare className="h-4 w-4 text-green-400" />}
              />
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-medium text-white">Document Insights</h2>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-700 text-zinc-400">
                  Last 30 days
                </Badge>
              </div>
              <div className="space-y-2">
                <InsightItem
                  title="Most Used Template"
                  value="Employment Contract"
                  icon={<FileText className="h-3.5 w-3.5 text-blue-400" />}
                />
                <InsightItem
                  title="Average Completion Time"
                  value="12 minutes"
                  icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
                />
                <InsightItem
                  title="Compliance Score"
                  value="92% - Good standing"
                  icon={<BarChart2 className="h-3.5 w-3.5 text-green-400" />}
                />
                <InsightItem
                  title="Risk Assessment"
                  value="Low risk - 3 minor issues"
                  icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-zinc-900 border-zinc-800 shadow-none">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium text-white">Important Dates</CardTitle>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-700 text-zinc-400">
                    3 Upcoming
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  <DeadlineItem title="Insurance Policy Review" dueDate="Due in 5 days" priority="high" />
                  <DeadlineItem title="Apartment Lease Renewal" dueDate="Due in 3 weeks" priority="medium" />
                  <DeadlineItem title="Tax Filing Deadline" dueDate="Due in 2 months" priority="low" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 shadow-none">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-medium text-white">Usage Statistics</CardTitle>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-700 text-zinc-400">
                    Last 30 days
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <StatCard title="Documents Created" value="24" change="+12%" />
                  <StatCard title="Contracts Analyzed" value="18" change="+5%" />
                  <StatCard title="Questions Asked" value="42" change="+28%" />
                  <StatCard title="Time Saved" value="36h" change="+15%" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-5">
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="bg-zinc-900 p-0 h-9 w-full grid grid-cols-2">
                <TabsTrigger value="activity" className="text-xs h-9 px-3 data-[state=active]:text-white data-[state=active]:bg-zinc-800">
                  Recent Activity
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs h-9 px-3 data-[state=active]:text-white data-[state=active]:bg-zinc-800">
                  Recent Documents
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-3">
                <Card className="bg-zinc-900 border-zinc-800 shadow-none">
                  <CardContent className="p-3 space-y-1">
                    <RecentActivityItem
                      title="Employment Contract"
                      type="Document Created"
                      time="2h ago"
                      icon={<FileText className="h-3.5 w-3.5 text-blue-400" />}
                    />
                    <RecentActivityItem
                      title="Apartment Lease"
                      type="Contract Analyzed"
                      time="Yesterday"
                      icon={<Search className="h-3.5 w-3.5 text-amber-400" />}
                    />
                    <RecentActivityItem
                      title="Copyright Question"
                      type="AI Chat Session"
                      time="2d ago"
                      icon={<MessageSquare className="h-3.5 w-3.5 text-green-400" />}
                    />
                    <RecentActivityItem
                      title="NDA Template"
                      type="Document Created"
                      time="3d ago"
                      icon={<FileText className="h-3.5 w-3.5 text-blue-400" />}
                    />
                    <RecentActivityItem
                      title="Freelance Contract"
                      type="Contract Analyzed"
                      time="5d ago"
                      icon={<Search className="h-3.5 w-3.5 text-amber-400" />}
                    />
                    <RecentActivityItem
                      title="Business Formation"
                      type="Document Created"
                      time="1w ago"
                      icon={<FileText className="h-3.5 w-3.5 text-blue-400" />}
                    />
                    <RecentActivityItem
                      title="Intellectual Property"
                      type="AI Chat Session"
                      time="1w ago"
                      icon={<MessageSquare className="h-3.5 w-3.5 text-green-400" />}
                    />
                    <div className="pt-2 flex justify-center">
                      <Button variant="link" size="sm" className="h-6 text-[11px] text-zinc-500 hover:text-white">
                        View all activity <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="documents" className="mt-3">
                <Card className="bg-zinc-900 border-zinc-800 shadow-none">
                  <CardContent className="p-3 space-y-2">
                    <DocumentItem title="Employment Contract" date="Modified 2 days ago" status="Complete" />
                    <DocumentItem title="Apartment Lease" date="Modified 5 days ago" status="In Review" />
                    <DocumentItem title="NDA Template" date="Modified 1 week ago" status="Complete" />
                    <DocumentItem title="Service Agreement" date="Modified 2 weeks ago" status="Draft" />
                    <DocumentItem title="Privacy Policy" date="Modified 3 weeks ago" status="Complete" />
                    <div className="pt-2 flex justify-center">
                      <Button variant="link" size="sm" className="h-6 text-[11px] text-zinc-500 hover:text-white">
                        View all documents <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}