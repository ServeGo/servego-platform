import React from 'react';
import { Link } from 'react-router-dom';
import Loader from '../scaffold/common/Loader';
import EmptyState from '../scaffold/common/EmptyState';

const PageShell = ({ title, description, actions = [], loading = false, isEmpty = false, children }) => (
  <div className="page-section">
    <div className="page-container">
      <div className="card page-shell-card">
        <div className="page-heading">
          <div>
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>
          {actions.length > 0 && (
            <div className="header-actions">
              {actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={action.primary ? 'button-primary' : 'button-secondary'}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      {loading ? <Loader /> : isEmpty ? <EmptyState /> : children}
    </div>
  </div>
);

export default PageShell;
