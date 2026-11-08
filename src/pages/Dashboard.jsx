
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  PieChart as PieChartIcon,
  ArrowUpRight,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Wrench
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import React, { useEffect, useState } from "react";
import "./Dashboard.css";

function Dashboard() {

const [dashboardData, setDashboardData] = useState(null);

useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/dashboard/summary"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error("Dashboard API Error:", error);
    }
  };

  fetchDashboardData();
}, []);

const data = dashboardData || {};

const passedCalibrations =
  data.calibrationResults?.find(
    (item) => item.result === "Pass"
  )?.count || 0;

const failedCalibrations =
  data.calibrationResults?.find(
    (item) => item.result === "Fail"
  )?.count || 0;

const totalInstruments = data.totalAssets || 0;
const overdueInstruments = data.overdueInstruments || 0;
const dueSoonInstruments = data.dueSoonInstruments || 0;

const validUsage =
  data.usageStatuses?.find(
    (item) => item.status === "Valid"
  )?.count || 0;

const invalidUsage =
  data.usageStatuses?.find(
    (item) => item.status === "Invalid"
  )?.count || 0;

const stats = [
  {
    title: "Total Instruments",
    value: totalInstruments,
    icon: Package,
    color: "blue",
    description: "Registered instruments"
  },
  {
    title: "Passed Calibrations",
    value: passedCalibrations,
    icon: CheckCircle,
    color: "green",
    description: "Successfully calibrated"
  },
  {
    title: "Failed Calibrations",
    value: failedCalibrations,
    icon: XCircle,
    color: "red",
    description: "Require attention"
  },
  {
    title: "Total Certificates",
    value: data.totalCertificates || 0,
    icon: FileCheck,
    color: "purple",
    description: "Certificates generated"
  },
  {
    title: "Work Orders",
    value: data.totalWorkOrders || 0,
    icon: Wrench,
    color: "orange",
    description: "Maintenance records"
  }
];

const calibrationData = [
  {
    name: "Passed",
    value: passedCalibrations,
    color: "#16a34a"
  },
  {
    name: "Failed",
    value: failedCalibrations,
    color: "#dc2626"
  }
];

const upcomingCalibrations = (data.upcomingCalibrations || []).map(
  (instrument) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(`${instrument.dueDate}T00:00:00`);
    const daysRemaining = Math.ceil(
      (dueDate - today) / (1000 * 60 * 60 * 24)
    );

    return {
      id: instrument.id,
      name: instrument.name,
      dueDate: instrument.dueDate,
      status: daysRemaining <= 7 ? "Due Soon" : "Scheduled"
    };
  }
);

const recentActivities = (data.recentActivities || [])
  .slice(0, 5)
  .map((activity, index) => ({
    id: activity.id || index,
    title: activity.activity || "Activity Recorded",
    description:
      activity.description ||
      activity.referenceId ||
      "Calibration management activity",
    time: activity.date || "Recently",
    type: "info"
  }));



  return (
    <div className="dashboard">

      {/* Dashboard Heading */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome back! Here's your factory calibration overview.
          </p>
        </div>

        <button className="report-button">
          View Reports <ArrowUpRight size={17} />
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">

        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div className="stat-card" key={item.title}>

              <div className="stat-top">
                <div className={`stat-icon ${item.color}`}>
                  <Icon size={22} />
                </div>
              </div>

              <h2>{item.value}</h2>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

            </div>
          );
        })}

      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">

        <div className="dashboard-panel">
          <h2>Calibration Overview</h2>
          <p>Calibration performance summary</p>
           <div className="chart-container">

  <ResponsiveContainer width="100%" height={250}>

    <PieChart>

      <Pie
        data={calibrationData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={65}
        outerRadius={95}
        paddingAngle={4}
      >

        {calibrationData.map((item) => (
          <Cell
            key={item.name}
            fill={item.color}
          />
        ))}

      </Pie>

      <Tooltip />

    </PieChart>

  </ResponsiveContainer>

  <div className="chart-legend">

    {calibrationData.map((item) => (
      <div className="legend-item" key={item.name}>

        <span
          className="legend-dot"
          style={{ backgroundColor: item.color }}
        />

        <span>{item.name}</span>

        <strong>{item.value}</strong>

      </div>
    ))}

  </div>

</div>
          
        </div>

        <div className="dashboard-panel">
          <h2>Critical Alerts</h2>
          <p>Issues requiring attention</p>

          <div className="alert-item">
            <AlertTriangle color="#dc2626" />
            <div>
              <h4>Overdue Instruments</h4>
              <span>{overdueInstruments} instruments need calibration</span>
            </div>
          </div>

          <div className="alert-item">
            <XCircle color="#9333ea" />
            <div>
              <h4>Calibration Failed</h4>
              <span>{failedCalibrations} instruments require attention</span>
            </div>
          </div>

          <div className="alert-item">
            <Clock color="#d97706" />
            <div>
              <h4>Calibration Due Soon</h4>
              <span>{dueSoonInstruments} instruments approaching due date</span>
            </div>
          </div>

        </div>

      </div>
      
<div className="dashboard-panel upcoming-panel">

  <div className="table-heading">
    <div>
      <h2>Upcoming Calibration</h2>
      <p>Instruments requiring attention</p>
    </div>
  </div>

  <div className="table-container">

    <table className="calibration-table">

      <thead>
        <tr>
          <th>Instrument ID</th>
          <th>Instrument Name</th>
          <th>Due Date</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>

        {upcomingCalibrations.map((item) => (

          <tr key={item.id}>

            <td>{item.id}</td>

            <td>{item.name}</td>

            <td>{item.dueDate}</td>

            <td>
              <span
                className={`status-badge ${
                  item.status === "Due Soon"
                    ? "due-soon"
                    : "scheduled"
                }`}
              >
                {item.status}
              </span>
            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

</div>

<div className="dashboard-panel recent-activities">

  <h2>Recent Activities</h2>

  <p>Latest activities across the factory</p>

  <div className="activity-list">

    {recentActivities.map((activity) => {

      const activityIcons = {
        success: CheckCircle2,
        info: FileCheck,
        danger: AlertCircle,
        warning: Wrench
      };

      const Icon = activityIcons[activity.type];

      return (
        <div className="activity-item" key={activity.id}>

          <div className={`activity-icon ${activity.type}`}>
            <Icon size={20} />
          </div>

          <div className="activity-details">
            <h4>{activity.title}</h4>
            <span>{activity.description}</span>
          </div>

          <span className="activity-time">
            {activity.time}
          </span>

        </div>
      );
    })}

  </div>

</div>
<p className="dashboard-note">
  Dashboard statistics are based on the latest available application records.
</p>

    </div>
  );
}

export default Dashboard;
