import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path); // ✅ This triggers the route change
  };
  
  const ButtonBox = ({ label, onClick, icon }: { label: string; onClick: () => void; icon: string }) => (
    <button
      onClick={onClick}
      className="group relative w-48 h-48 bg-white border-2 border-emerald-500 flex flex-col items-center justify-center text-lg font-bold rounded-2xl hover:bg-emerald-500 hover:border-emerald-600 transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
    >
      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="text-gray-800 group-hover:text-white transition-colors duration-300">
        {label}
      </span>
      <div className="absolute inset-0 rounded-2xl bg-emerald-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
    </button>
  );
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
      {/* Header */}
      <div className="mb-16 text-center">
        <h1 className="text-6xl font-bold text-emerald-600 mb-4 tracking-tight">
          Restaurant POS
        </h1>
        <p className="text-xl text-gray-600">
          Choose your access point to continue
        </p>
      </div>
      
      {/* Button Grid */}
      <div className="flex flex-wrap gap-8 justify-center items-center max-w-4xl px-8">
        <ButtonBox 
          label="Admin Access" 
          onClick={() => handleNavigation("/admin-login")}
          icon="👨‍💼"
        />
        <ButtonBox 
          label="Staff Access" 
          onClick={() => handleNavigation("/staff-login")}
          icon="👨‍🍳"
        />
        <ButtonBox 
          label="Place Order" 
          onClick={() => handleNavigation("/table-select")}
          icon="🍽️"
        />
      </div>
      
      {/* Footer */}
      <div className="mt-16 text-center text-gray-500 text-sm">
        <p>Powered by Modern POS System</p>
      </div>
    </div>
  );
};

export default Landing;
