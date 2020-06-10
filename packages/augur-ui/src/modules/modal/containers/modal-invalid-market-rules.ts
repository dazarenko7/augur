import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import { Message } from 'modules/modal/message';
import { AppState } from 'appStore';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import { AppStatus } from 'modules/app/store/app-status';

const mapStateToProps = (state: AppState) => {
  return {
    modal: AppStatus.get().modal,
  };
};

const mapDispatchToProps = (dispatch: ThunkDispatch<void, any, Action>) => ({
  closeModal: () => AppStatus.actions.closeModal(),
});

const mergeProps = (sP: any, dP: any, oP: any) => ({
  title: 'Invalid Outcome',
  invalidMarketRules: true,
  closeAction: () => {
    dP.closeModal();
    if (sP.modal.cb) {
      sP.modal.cb();
    }
  },
  buttons: [
    {
      text: 'Ok',
      action: () => {
        dP.closeModal();
      },
    },
  ],
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )(Message)
);
