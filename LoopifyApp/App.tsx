
// App.tsx - Main Application Entry
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ====================================================
// TYPES & INTERFACES
// ====================================================

interface User {
  id: string;
  email: string;
  name: string;
  primaryFocus: string;
}

interface Task {
  id: string;
  loopId: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
  order: number;
}

interface Loop {
  id: string;
  userId: string;
  name: string;
  frequency: 'daily' | 'weekly';
  isActive: boolean;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  createdAt: string;
  tasks: Task[];
  completedToday: boolean;
  motivationMessage: string;
}

interface DashboardLoop {
  id: string;
  name: string;
  frequency: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
  completedToday: boolean;
  currentStreak: number;
  motivationMessage: string;
}
