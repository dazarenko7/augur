import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { AppState } from 'appStore';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import { SocialMediaButtons } from '../components/common/social-media-buttons';
import { sendFacebookShare, sendTwitterShare } from 'services/analytics/helpers';
import { AppStatus } from 'modules/app/store/app-status';

const mapStateToProps = (state: AppState) => ({
    address: AppStatus.get().loginAccount.address,
});

const mapDispatchToProps = (dispatch: ThunkDispatch<void, any, Action>) => ({
  sendFacebookShare: (marketAddress, marketDescription) => dispatch(sendFacebookShare(marketAddress, marketDescription)),
  sendTwitterShare: (marketAddress, marketDescription) => dispatch(sendTwitterShare(marketAddress, marketDescription)),
});

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
  )(SocialMediaButtons)
);
