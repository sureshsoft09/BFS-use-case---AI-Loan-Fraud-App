
import React, {  useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import './BankingDashboard.css';
import DescriptionBox from '../components/DescriptionBox';
import CommentaryBox from '../components/CommentaryBox';
import NarrativeBox from '../components/NarrativeBox';
import MainDashboard from './MainDashboard';
import DashboardIcon from '../assets/agentIcons/grid.png';
import FileIcon from '../assets/agentIcons/fileIcon.png';
import BarGraphIcon from '../assets/agentIcons/thirdBar.png';
import GraphIcon from '../assets/agentIcons/fourthGrowth.png';
import BehaviourIcon from '../assets/agentIcons/fifthPulse.png';
import KYCIcon from '../assets/agentIcons/lastIcon.png';
 
const AGENTS = [
   { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  {id: 'Dynamic Orchestration Agent', label: 'Dynamic Orch. Agent', icon: FileIcon},
  { id: 'Delegation_Agent', label: 'DEX Agent', icon: BarGraphIcon },
  { id: 'Graph_Agent', label: 'Fraud Ring agent', icon: GraphIcon },
  { id: 'Behavioural_Agent', label: 'Behavioural Agent', icon: BehaviourIcon },
  { id: 'KYC_Agent', label: 'KYC_Agent', icon: KYCIcon },
];
 
const Dashboard = () => {
  const {state, dispatch} = useAppContext();
  
  useEffect(() => {
    //it shifts sidebar navs
    const stepToAgent = {
      // 0: 'upload',
      0: 'dashboard',
      1: 'Delegation_Agent',
      2: 'Graph_Agent',
      3: 'Behavioural_Agent',
      4: 'KYC_Agent',
      5: 'dashboard', // Final Destination
    };
 


   if (typeof state.currentStep === "number") {
      dispatch({
        type: "SET_SELECTED_AGENT",
        payload: stepToAgent[state.currentStep] ,
      })
    }
  }, [state.currentStep, dispatch]);

  const isKYCAgentSelected = state.selectedAgent === 'KYC_Agent';

  

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <nav className="sidebar-nav">
          <ul>
            {AGENTS.map((a) => {
              const isActive = a.id === state.selectedAgent;
              return (
                <li
                  key={a.id}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  // onClick={() => setSelectedAgent(a.id)}
                  onClick={() => dispatch({
                    type: "SET_SELECTED_AGENT", payload: a.id
                  })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && dispatch({type: "SET_SELECTED_AGENT", payload: a.id})}
                >
                  <img 
                    src={a.icon} 
                    alt="" 
                    className="agent-icon" 
                    aria-hidden="true" 
                  />
                  <span className="item-label">{a.label}</span>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
 
      <main className="main-content">

        {isKYCAgentSelected?  
         ( <>
         <div className="left-pane">
          <DescriptionBox selectedAgent={state.selectedAgent} />
          <CommentaryBox selectedAgent={state.selectedAgent} />

        </div>
 
        <div className="right-pane">
          <NarrativeBox selectedAgent={state.selectedAgent} />
        </div> 
        </>
         )
     :    ( <MainDashboard /> )

        
        }
     
       
      </main>
    </div>
  );
};
 
export default Dashboard;