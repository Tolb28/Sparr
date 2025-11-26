import { WeeklyCalendar } from 'react-native-simple-weekly-calendar';
import { Dumbbell, Footprints, HandFist, Brain } from 'lucide-react-native';

const trainingOfTheDay: Record<number, React.ComponentType<any>> = {
    1: Dumbbell,
    2: Footprints,
    3: HandFist,
    4: Brain,
    5: Dumbbell,
    6: Footprints,
    7: HandFist,
    8: Brain,
    9: Dumbbell,
    10: Footprints,
    11: HandFist,
    12: Brain,  
    13: Dumbbell,
    14: Footprints,
    15: HandFist,
    16: Brain,
    17: Dumbbell,
    18: Footprints,
    19: HandFist,
    20: Brain,
    21: Dumbbell,
    22: Footprints,
    23: HandFist,
    24: Brain,
    25: Dumbbell,
    26: Footprints,
    27: HandFist,
    28: Brain,
    29: Dumbbell,
    30: Footprints,
    31: HandFist,
  };
  const today: Date = new Date();
// Get the date components adjusted for local timezone offset
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
const day = today.getDate().toString().padStart(2, '0');

const formattedDate: string = `${year}-${month}-${day}`;

const MyTrainingCalendar = () => {
        return (
            <WeeklyCalendar
                dayComponent={({ date }) => {
                    console.log('date', date, 'date number', Number(date));
                    const IconComponent = trainingOfTheDay[Number(date.substring(8, 10))] || Dumbbell;
                    return <IconComponent size={25} color={date === formattedDate ? "rgba(0, 148, 197, 1)" : "#111"} />;
                }}
            />
        );
    }
export default MyTrainingCalendar;