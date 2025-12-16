import { WeeklyCalendar } from 'react-native-simple-weekly-calendar';
import { HelpCircle, CircleSlashed } from 'lucide-react-native';
import { Pressable } from 'react-native';

const today: Date = new Date();
const year = today.getFullYear();
const month = (today.getMonth() + 1).toString().padStart(2, '0');
const day = today.getDate().toString().padStart(2, '0');
const formattedDate: string = `${year}-${month}-${day}`;

function mapIconNameToComponent(name?: string) {
  if (!name) return undefined;
  switch (name.toLowerCase()) {
    case 'dumbbell':
    case 'dumbell':
      return ;
    case 'footprints':
    case 'footprint':
      return;
    case 'handfist':
    case 'hand_fist':
    case 'hand-fist':
      return;
    case 'brain':
      return ;
    default:
      return undefined;
  }
}

const MyTrainingCalendar = ({
  onSelectDate,
  items,
  selectedDate,
}: {
  onSelectDate?: (date: string) => void;
  items?: any[];
  selectedDate?: string;
}) => {
  return (
    <WeeklyCalendar
      dayComponent={({ date }) => {
        // date format is YYYY-MM-DD
        const dayNum = Number(date.substring(8, 10));

        // default fallback icon based on weekday cycling
        const fallback = CircleSlashed;

        if (items && items.length > 0) {
          const orders = Array.from(new Set(items.map((it: any) => Number(it.order)))).sort((a: number, b: number) => a - b);
          const n = orders.length || 1;
          const idx = ((dayNum - 1) % n) + 1;
          const item = items.find((it: any) => Number(it.order) === idx);
          // If icon_name is explicitly null, show a question mark; otherwise map name, or fallback
          let IconComponent: React.ComponentType<any> | undefined;
          if (item && Object.prototype.hasOwnProperty.call(item, 'icon_name')) {
            if (item.icon_name === null) {
              IconComponent = HelpCircle;
            } else {
              IconComponent = mapIconNameToComponent(item.icon_name) || fallback;
            }
          } else {
            IconComponent = mapIconNameToComponent(item?.icon_name) || fallback;
          }
          return (
            <Pressable onPress={() => onSelectDate && onSelectDate(date)}>
              <IconComponent size={25} color={date === (selectedDate) ? 'rgba(0, 148, 197, 1)' : (date === (formattedDate) ? 'rgba(0, 0, 0, 1)' : '#848484ff')} />
            </Pressable>
          );
        }

        const Fallback = fallback;
        return (
          <Pressable onPress={() => onSelectDate && onSelectDate(date)}>
            <Fallback size={25} color={date === (selectedDate || formattedDate) ? 'rgba(0, 148, 197, 1)' : '#848484ff'} />
          </Pressable>
        );
      }}
    />
  );
};

export default MyTrainingCalendar;