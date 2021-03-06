import React from 'react';
import Styles from 'modules/portfolio/activity.styles.less';
import { UsdIcon } from 'modules/common/icons';
import { Pagination } from 'modules/common/pagination';
import { useAppStatusStore } from '../stores/app-status';
import { ActivityItem } from '../types';
import { ReceiptLink } from '../routes/helpers/links';


const ActivityCard = ({ activity }: { activity: ActivityItem }) => (
  <div className={Styles.ActivityCard}>
    <div>{activity.type}</div>
    <div>{activity.value}</div>
    <div>{UsdIcon}</div>
    <span>{activity.description}</span>
    <div>{activity.subheader}</div>
    <div>{activity.time}</div>
    <ReceiptLink hash={activity.txHash} />
  </div>
);

export const Activity = () => {
  const {
    isLogged,
    userInfo: { activity },
  } = useAppStatusStore();
  return (
    <div className={Styles.Activity}>
      <span>your activity</span>
      {isLogged && activity.length > 0 ? (
        <>
          <div>
            {activity.map((activityGroup) => (
              <div key={activityGroup.date}>
                <span>{activityGroup.date}</span>
                <div>
                  {activityGroup.activity.map((activityItem) => (
                    <ActivityCard
                      key={activityItem.id}
                      activity={activityItem}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={1}
            itemCount={10}
            itemsPerPage={9}
            action={() => null}
            updateLimit={() => null}
          />
        </>
      ) : <span>No activity to show</span>}
    </div>
  );
};
export default Activity;
