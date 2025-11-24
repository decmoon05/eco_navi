import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getReportAPI } from '../services/api';
import { PieChart } from 'react-minimal-pie-chart';
import { getTransportModeInfo, formatDistance, formatEmission } from '../utils/carbonCalculator';

// --- Styled Components ---
const ReportContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  text-align: center;
  color: white;
  margin-bottom: 30px;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 30px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ccc;
  font-size: 1rem;
`;

const ReportBody = styled.div`
  background: white;
  color: #333;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
`;

const Section = styled.div`
  margin-bottom: 30px;
  &:last-child { margin-bottom: 0; }
`;

const SectionTitle = styled.h2`
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
  margin-bottom: 20px;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const StatCard = styled.div`
  background: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #666;
`;

const ChartContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
`;

// --- Component ---
const ReportPage: React.FC = () => {
  const [date, setDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await getReportAPI(date.year, date.month);
        setReport(response.data);
      } catch (error) {
        console.error("Failed to fetch report:", error);
        setReport(null); // Clear previous report on error
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [date]);

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDate(prev => ({ ...prev, [name]: Number(value) }));
  };

  const years = [2024, 2025]; // 예시
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const chartData = report?.modeCounts ? 
    Object.entries(report.modeCounts).map(([mode, count]) => ({
      title: getTransportModeInfo(mode as any).name,
      value: count as number,
      color: getTransportModeInfo(mode as any).color,
    })) : [];

  return (
    <ReportContainer>
      <Title>월간 리포트</Title>
      <Controls>
        <Select name="year" value={date.year} onChange={handleDateChange}>
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </Select>
        <Select name="month" value={date.month} onChange={handleDateChange}>
          {months.map(m => <option key={m} value={m}>{m}월</option>)}
        </Select>
      </Controls>

      {loading ? (
        <p style={{ color: 'white', textAlign: 'center' }}>리포트를 불러오는 중...</p>
      ) : report && !report.message ? (
        <ReportBody>
          <Section>
            <SectionTitle>종합</SectionTitle>
            <StatGrid>
              <StatCard>
                <StatValue>{report.totalTrips}회</StatValue>
                <StatLabel>총 이동 횟수</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{formatDistance(report.totalDistance)}</StatValue>
                <StatLabel>총 이동 거리</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{formatDistance(report.averageDistance)}</StatValue>
                <StatLabel>평균 이동 거리</StatLabel>
              </StatCard>
            </StatGrid>
          </Section>

          <Section>
            <SectionTitle>교통수단</SectionTitle>
            <ChartContainer>
              <div style={{ width: '200px', height: '200px' }}>
                <PieChart data={chartData} lineWidth={60} animate />
              </div>
              <ul>
                {chartData.map(d => <li key={d.title}><span style={{color: d.color}}>●</span> {d.title}: {d.value}회</li>)}
              </ul>
            </ChartContainer>
          </Section>

          <Section>
            <SectionTitle>나의 성과</SectionTitle>
            <StatGrid>
              <StatCard>
                <StatValue>{report.bestDay.date}</StatValue>
                <StatLabel>가장 친환경적인 날</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{formatEmission(report.bestDay.savings)}</StatValue>
                <StatLabel>최고 절약량</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>상위 {100 - report.percentile.toFixed(1)}%</StatValue>
                <StatLabel>나의 친환경 백분위</StatLabel>
              </StatCard>
            </StatGrid>
          </Section>

        </ReportBody>
      ) : (
        <p style={{ color: 'white', textAlign: 'center' }}>{report?.message || '리포트를 불러올 수 없습니다.'}</p>
      )}
    </ReportContainer>
  );
};

export default ReportPage;
