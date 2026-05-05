import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface DailyData {
  date: string;
  seconds: number;
}

interface Props {
  dailyData: DailyData[];
  weeks?: number;
}

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function getCellColor(seconds: number, isFuture: boolean, isToday: boolean): string {
  if (isFuture) return '#f1ede4';
  if (seconds === 0) return '#e8ddc6';
  if (seconds < 1800) return '#c6a97a';
  if (seconds < 3600) return '#a67c52';
  if (seconds < 7200) return '#8b5e34';
  return '#5c3d1e';
}

const CELL = 11;
const GAP = 3;

export default function ActivityHeatmap({ dailyData, weeks = 12 }: Props) {
  const { tokens } = useTheme();

  const { columns, months } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - today.getDay()));

    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - weeks * 7 + 1);

    const dataMap = new Map<string, number>();
    for (const d of dailyData) dataMap.set(d.date, d.seconds);

    const cols: { date: string; seconds: number; isToday: boolean; isFuture: boolean }[][] = [];
    const monthLabels: { name: string; colIndex: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let dow = 0; dow < 7; dow++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + dow);
        const dateStr = toLocalDateStr(date);
        if (dow === 0 && date.getMonth() !== lastMonth) {
          monthLabels.push({
            name: date.toLocaleDateString('en', { month: 'short' }),
            colIndex: w,
          });
          lastMonth = date.getMonth();
        }
        col.push({
          date: dateStr,
          seconds: dataMap.get(dateStr) ?? 0,
          isToday: dateStr === todayStr,
          isFuture: date > today,
        });
      }
      cols.push(col);
    }

    return { columns: cols, months: monthLabels };
  }, [dailyData, weeks]);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels */}
          <View style={{ flexDirection: 'row', marginBottom: 4, marginLeft: 22 }}>
            {months.map((m, i) => {
              const prevCol = months[i - 1]?.colIndex ?? 0;
              const offset = i === 0 ? m.colIndex : m.colIndex - prevCol;
              return (
                <View key={i} style={{ marginLeft: i === 0 ? m.colIndex * (CELL + GAP) : (offset - 1) * (CELL + GAP) }}>
                  <Text style={{ fontSize: 10, color: tokens.textMuted }}>{m.name}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row' }}>
            {/* Day labels */}
            <View style={{ justifyContent: 'space-around', marginRight: 4, gap: GAP }}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
                <View key={i} style={{ width: 14, height: CELL, justifyContent: 'center' }}>
                  {(i === 1 || i === 3 || i === 5) ? (
                    <Text style={{ fontSize: 9, color: tokens.textMuted, textAlign: 'right' }}>{label}</Text>
                  ) : null}
                </View>
              ))}
            </View>

            {/* Grid */}
            <View style={{ flexDirection: 'row', gap: GAP }}>
              {columns.map((col, wi) => (
                <View key={wi} style={{ flexDirection: 'column', gap: GAP }}>
                  {col.map((day) => (
                    <View
                      key={day.date}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: 2,
                        backgroundColor: getCellColor(day.seconds, day.isFuture, day.isToday),
                        borderWidth: day.isToday ? 1.5 : 0,
                        borderColor: day.isToday ? tokens.accent : 'transparent',
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6, gap: 3 }}>
            <Text style={{ fontSize: 9, color: tokens.textMuted, marginRight: 1 }}>Less</Text>
            {['#e8ddc6', '#c6a97a', '#a67c52', '#8b5e34', '#5c3d1e'].map((color) => (
              <View key={color} style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: color }} />
            ))}
            <Text style={{ fontSize: 9, color: tokens.textMuted, marginLeft: 1 }}>More</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
