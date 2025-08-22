"use client";

import { TrendingUp, Users, Bell, MessageCircle, Target, Eye, Heart, UserPlus } from "lucide-react";
import { useTheme } from '@/context/theme/ThemeContext';

import React from 'react';

const DashboardSidebarWidgets = React.memo(function DashboardSidebarWidgets() {
  const { isDarkMode } = useTheme();
  // User's recent activity/notifications
  const recentActivity = [
    { type: "like", user: "Sarah Chen", content: "liked your startup pitch", time: "2m ago", avatar: "SC" },
    { type: "comment", user: "Mike Johnson", content: "commented on your post", time: "15m ago", avatar: "MJ" },
    { type: "follow", user: "Jessica Liu", content: "started following you", time: "1h ago", avatar: "JL" },
    { type: "mention", user: "David Park", content: "mentioned you in a post", time: "3h ago", avatar: "DP" }
  ];

  // User's post performance
  const myPosts = [
    { title: "Building MVP in 30 days", views: 2847, likes: 156, comments: 23, engagement: "+32%" },
    { title: "Fundraising lessons learned", views: 1923, likes: 89, comments: 31, engagement: "+18%" },
    { title: "Remote team scaling tips", views: 1456, likes: 67, comments: 12, engagement: "+25%" }
  ];

  // Suggested connections
  const suggestedConnections = [
    { name: "Alex Rodriguez", title: "Y Combinator Founder", mutualConnections: 12, avatar: "AR" },
    { name: "Emma Thompson", title: "SaaS Marketing Expert", mutualConnections: 8, avatar: "ET" },
    { name: "Ryan Kim", title: "Angel Investor", mutualConnections: 15, avatar: "RK" }
  ];

  // Personal goals/bookmarks
  const myGoals = [
    { goal: "Reach 1K followers", current: 847, target: 1000, progress: 85 },
    { goal: "Monthly revenue $10K", current: 7200, target: 10000, progress: 72 },
    { goal: "Launch new feature", current: 80, target: 100, progress: 80, unit: "%" },
    { goal: "Hire 2 developers", current: 1, target: 2, progress: 50 }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-3 h-3 text-red-500" />;
      case 'comment': return <MessageCircle className="w-3 h-3 text-gray-400" />;
      case 'follow': return <UserPlus className="w-3 h-3 text-green-500" />;
      case 'mention': return <Bell className="w-3 h-3 text-gray-400" />;
      default: return <Bell className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Recent Activity Widget */}
      <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-950/90 border-gray-900/50' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Bell className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`} />
          <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => (
            <div key={index} className={`${isDarkMode ? 'bg-gray-900/40 border-gray-800/30' : 'bg-gray-50 border-gray-100'} flex items-start gap-3 p-2 rounded-md border`}> 
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${isDarkMode ? 'bg-gray-800/60 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                {activity.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  {getActivityIcon(activity.type)}
                  <p className={`text-xs ${isDarkMode ? 'text-gray-100' : 'text-slate-900'}`}>
                    <span className="font-medium">{activity.user}</span> {activity.content}
                  </p>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Posts Performance Widget */}
      <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-950/90 border-gray-900/50' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`} />
          <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Posts Performance</h2>
        </div>
        <div className="space-y-3">
          {myPosts.map((post) => (
            <div key={post.title} className={`${isDarkMode ? 'bg-gray-900/40 border-gray-800/30' : 'bg-gray-50 border-gray-100'} p-3 rounded-md border`}> 
              <h3 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-2`}>{post.title}</h3>
              <div className={`flex justify-between items-center text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-600'} mb-2`}> 
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>{post.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>{post.comments}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                  {post.engagement}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Connections Widget */}
      <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-950/90 border-gray-900/50' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Users className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`} />
          <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>People to Connect</h2>
        </div>
        <div className="space-y-3">
          {suggestedConnections.map((person) => (
            <div key={person.name} className={`${isDarkMode ? 'bg-gray-900/40 border-gray-800/30' : 'bg-gray-50 border-gray-100'} p-3 rounded-md border`}> 
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${isDarkMode ? 'bg-gray-800/60 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                    {person.avatar}
                  </div>
                  <div>
                    <h3 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{person.name}</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{person.title}</p>
                  </div>
                </div>
                <button className={`text-xs ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-800 hover:bg-gray-700 text-white'} px-3 py-1 rounded-md transition-colors`}>
                  Connect
                </button>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-slate-500'}`}>{person.mutualConnections} mutual connections</p>
            </div>
          ))}
        </div>
      </div>

      {/* My Goals Progress Widget */}
      <div className={`p-4 border rounded-lg ${isDarkMode ? 'bg-gray-950/90 border-gray-900/50' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Target className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`} />
          <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Goals</h2>
        </div>
        <div className="space-y-3">
          {myGoals.map((goal) => (
            <div key={goal.goal} className={`${isDarkMode ? 'bg-gray-900/40 border-gray-800/30' : 'bg-gray-50 border-gray-100'} p-3 rounded-md border`}> 
              <div className="flex justify-between items-center mb-2">
                <h3 className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{goal.goal}</h3>
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>{goal.progress}%</span>
              </div>
              <div className={`w-full ${isDarkMode ? 'bg-gray-800/40' : 'bg-gray-200'} rounded-full h-2 mb-1`}>
                <div 
                  className={`bg-gradient-to-r ${isDarkMode ? 'from-gray-500 to-gray-400' : 'from-gray-500 to-gray-600'} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${goal.progress}%` }}
                ></div>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                {goal.unit === '%' ? `${goal.current}%` : goal.current.toLocaleString()} / {goal.unit === '%' ? '100%' : goal.target.toLocaleString()}
                {goal.unit && goal.unit !== '%' ? ` ${goal.unit}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default DashboardSidebarWidgets;