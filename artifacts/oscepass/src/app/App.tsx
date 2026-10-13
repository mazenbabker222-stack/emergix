import { Router as WouterRouter } from 'wouter';
import { Router } from './Router';
import { Providers } from './providers';

function App() {
  return <Providers><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></Providers>;
}

export default App;
