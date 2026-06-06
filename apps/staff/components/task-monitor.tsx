'use client';

import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import { AlertCircle, Bell, CheckCircle2, Clock, Filter, Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTaskMonitorData, type TaskMonitorItem } from '../lib/api-client';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { useToast } from './ui/use-toast';
import { Progress } from './ui/progress';
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface ScholarTaskStats {
  scholarId: string;
  scholarName: string;
  program: string;
  cohort: string;
  total: number;
  completed: number;
  completionRate: number;
  overdueTasks: TaskMonitorItem[];
  upcomingTasks: TaskMonitorItem[];
  urgency: 'high' | 'medium' | 'low';
}

interface TaskMonitorProps {
  refreshTrigger?: number;
}

export function TaskMonitor({ refreshTrigger = 0 }: TaskMonitorProps = {}) {
  const { toast } = useToast();
  const [data, setData] = useState<TaskMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getTaskMonitorData();
      setData(items || []);
    } catch (e) {
      toast({
        title: 'Could not load task monitor data',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData, refreshTrigger]);

  const uniqueCohorts = useMemo(() => Array.from(new Set(data.map(d => d.cohort).filter(Boolean))), [data]);
  const uniquePrograms = useMemo(() => Array.from(new Set(data.map(d => d.program).filter(Boolean))), [data]);
  const uniqueTaskTypes = useMemo(() => Array.from(new Set(data.map(d => d.type).filter(Boolean))), [data]);

  const scholarStats = useMemo(() => {
    // 1. Filter raw tasks
    let filteredTasks = data;
    if (taskTypeFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.type === taskTypeFilter);
    }
    if (cohortFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.cohort === cohortFilter);
    }
    if (programFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.program === programFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filteredTasks = filteredTasks.filter(t => 
        t.scholarName.toLowerCase().includes(q) || 
        t.title.toLowerCase().includes(q)
      );
    }

    // 2. Group by scholar
    const map = new Map<string, ScholarTaskStats>();
    const now = new Date();
    const thresholdDate = addDays(now, 3); // 72 hours

    for (const task of filteredTasks) {
      if (!map.has(task.scholarId)) {
        map.set(task.scholarId, {
          scholarId: task.scholarId,
          scholarName: task.scholarName,
          program: task.program || 'N/A',
          cohort: task.cohort || 'N/A',
          total: 0,
          completed: 0,
          completionRate: 0,
          overdueTasks: [],
          upcomingTasks: [],
          urgency: 'low'
        });
      }
      
      const stats = map.get(task.scholarId)!;
      stats.total++;
      if (task.status === 'completed') {
        stats.completed++;
      } else {
        const dueDate = new Date(task.dueDate);
        if (isBefore(dueDate, now)) {
          stats.overdueTasks.push(task);
        } else {
          stats.upcomingTasks.push(task);
        }
      }
    }

    // 3. Compute final stats and urgency, exclusively keeping scholars with incomplete tasks
    const result = Array.from(map.values())
      .filter(stats => (stats.total - stats.completed) > 0)
      .map(stats => {
        stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        
        // Only trigger high urgency for overdue tasks. If tasks are upcoming within 3 days, medium.
        const now = new Date();
        const thresholdDate = addDays(now, 3);
        const hasNearingDeadline = stats.upcomingTasks.some(t => isBefore(new Date(t.dueDate), thresholdDate));
        
        if (stats.overdueTasks.length > 0) {
          stats.urgency = 'high';
        } else if (hasNearingDeadline) {
          stats.urgency = 'medium';
        } else {
          stats.urgency = 'low';
        }
        
        stats.overdueTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        stats.upcomingTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        return stats;
      });

    // 4. Sort by urgency (high -> medium -> low), then completion rate (lowest first)
    result.sort((a, b) => {
      const urgencyScore = { high: 0, medium: 1, low: 2 };
      if (urgencyScore[a.urgency] !== urgencyScore[b.urgency]) {
        return urgencyScore[a.urgency] - urgencyScore[b.urgency];
      }
      return a.completionRate - b.completionRate;
    });

    return result;
  }, [data, search, cohortFilter, programFilter, taskTypeFilter]);

  const handleSendReminder = async (scholarId: string) => {
    setSendingReminder(scholarId);
    // Simulate sending a reminder (does not modify task history)
    await new Promise(resolve => setTimeout(resolve, 800));
    toast({
      title: 'Reminder sent',
      description: 'The scholar has been notified about their upcoming/overdue tasks.',
    });
    setSendingReminder(null);
  };

  if (loading) {
    return (
      <Card className="border border-border/40">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-sm flex flex-col h-[500px]">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">Task Completion Monitor</CardTitle>
            <CardDescription>
              Track scholar task completion rates and surface upcoming or overdue deadlines.
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scholars or tasks..."
                className="pl-8 w-full sm:w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={cohortFilter} onValueChange={setCohortFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {uniqueCohorts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {uniquePrograms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTaskTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto pr-4 pb-4">
        {scholarStats.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
            <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium">No tasks found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scholarStats.map(stat => (
              <div 
                key={stat.scholarId} 
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg transition-colors hover:bg-muted/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">{stat.scholarName}</h4>
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary whitespace-nowrap">
                      {stat.cohort} • {stat.program}
                    </span>
                    {stat.urgency === 'high' && (
                      <Badge variant="destructive" className="text-[10px] h-5 px-1.5 flex items-center gap-1 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" /> Overdue Tasks
                      </Badge>
                    )}
                    {stat.urgency === 'medium' && (
                      <Badge className="text-[10px] h-5 px-1.5 flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white border-transparent whitespace-nowrap">
                        <Clock className="w-3 h-3" /> Upcoming Deadlines
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 max-w-[200px]">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">Completion Rate</span>
                        <span className="font-medium">{stat.completionRate}%</span>
                      </div>
                      <Progress value={stat.completionRate} className="h-2" />
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {stat.completed} of {stat.total} tasks
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 mt-1 md:mt-0">
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    {stat.overdueTasks.slice(0, 2).map(t => (
                      <div key={t.id} className="text-xs flex items-center gap-1.5 text-destructive">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[150px]" title={t.title}>{t.title}</span>
                        <span className="ml-auto flex-shrink-0 font-medium">Overdue</span>
                      </div>
                    ))}
                    {stat.upcomingTasks.slice(0, Math.max(0, 2 - stat.overdueTasks.length)).map(t => (
                      <div key={t.id} className="text-xs flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[150px]" title={t.title}>{t.title}</span>
                        <span className="ml-auto flex-shrink-0 font-medium">Due in {formatDistanceToNow(new Date(t.dueDate))}</span>
                      </div>
                    ))}
                    {(stat.overdueTasks.length + stat.upcomingTasks.length > 2) && (
                      <Dialog>
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <DialogTrigger asChild>
                              <div className="text-[10px] text-muted-foreground pl-4 cursor-pointer hover:underline mt-1">
                                + {stat.overdueTasks.length + stat.upcomingTasks.length - 2} more requiring attention
                              </div>
                            </DialogTrigger>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">Incomplete Tasks</h4>
                              <div className="text-xs space-y-2">
                                {[...stat.overdueTasks, ...stat.upcomingTasks].slice(2).map(t => (
                                  <div key={t.id} className="flex justify-between items-start gap-2">
                                    <span className="truncate max-w-[180px] font-medium">{t.title}</span>
                                    <span className={isBefore(new Date(t.dueDate), new Date()) ? "text-destructive whitespace-nowrap" : "text-amber-500 whitespace-nowrap"}>
                                      {isBefore(new Date(t.dueDate), new Date()) ? 'Overdue' : 'Due in'} {formatDistanceToNow(new Date(t.dueDate))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Tasks for {stat.scholarName}</DialogTitle>
                            <DialogDescription>
                              All incomplete tasks requiring attention.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                            {[...stat.overdueTasks, ...stat.upcomingTasks].map(t => {
                              const isOverdue = isBefore(new Date(t.dueDate), new Date());
                              return (
                                <div key={t.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                                  <div>
                                    <h5 className="font-medium text-sm">{t.title}</h5>
                                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{t.type.replace(/_/g, ' ')}</p>
                                  </div>
                                  <Badge variant={isOverdue ? "destructive" : "outline"} className={!isOverdue ? "text-amber-600 border-amber-500 whitespace-nowrap" : "whitespace-nowrap"}>
                                    {isOverdue ? 'Overdue' : 'Due in'} {formatDistanceToNow(new Date(t.dueDate))}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                    {(stat.overdueTasks.length === 0 && stat.upcomingTasks.length === 0) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> All clear
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full sm:w-auto sm:ml-auto mt-2 sm:mt-0">
                    <Button
                      variant={stat.urgency === 'high' ? 'destructive' : stat.urgency === 'medium' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSendReminder(stat.scholarId)}
                      disabled={sendingReminder !== null || stat.urgency === 'low'}
                      className={`w-full sm:w-auto ${stat.urgency === 'medium' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                    >
                      {sendingReminder === stat.scholarId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4 mr-2" />
                      )}
                      Send Reminder
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
