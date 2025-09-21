import { MyTasks } from '../../../components/my-tasks';

export default function TasksPage() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">My Tasks</h2>
      <MyTasks />
    </div>
  );
}